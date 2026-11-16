using System.Text.Json;
using Ecommerce.Application.Services;
using Ecommerce.Domain.Common;
using Ecommerce.Domain.Entities;
using Ecommerce.Domain.Enums;
using Ecommerce.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Ecommerce.Infrastructure.Services;

public record CheckoutItemRequest(Guid VariantId, int Quantity);

public record CheckoutQuoteLine(
    Guid VariantId,
    string InternalSku,
    string ProductName,
    int Quantity,
    decimal UnitPriceRsd,
    decimal LineTotalRsd,
    string FulfillmentSource,
    string PublicAvailabilityLabel,
    bool IsAvailable);

public record CheckoutQuoteResponse(
    IReadOnlyList<CheckoutQuoteLine> Lines,
    decimal SubtotalRsd,
    decimal ShippingCostRsd,
    decimal TotalRsd,
    bool CanProceed,
    string? ValidationError,
    decimal DiscountRsd = 0m,
    string? AppliedCouponCode = null,
    string? CouponMessage = null);

public record CheckoutConfirmRequest(
    string IdempotencyKey,
    string CustomerFullName,
    string CustomerPhone,
    string CustomerEmail,
    string ShippingStreet,
    string ShippingCity,
    string ShippingPostalCode,
    string? CustomerNote,
    IReadOnlyList<CheckoutItemRequest> Items,
    string? CouponCode = null,
    string? PreferredPaymentMethod = null);

public record CheckoutConfirmResult(
    bool Succeeded,
    bool WasDuplicateIdempotentReplay,
    string? ErrorCode,
    string? UserMessage,
    Order? Order);

public class CheckoutOrderService(
    EcommerceDbContext db,
    HybridInventoryService inventoryService,
    AntiFraudRiskEvaluator riskEvaluator)
{
    private static readonly SemaphoreSlim CheckoutLock = new(1, 1);

    public async Task<CheckoutQuoteResponse> QuoteAsync(
        IReadOnlyList<CheckoutItemRequest> items,
        CancellationToken ct = default,
        string? couponCode = null)
    {
        if (items is null || items.Count == 0)
        {
            return new CheckoutQuoteResponse([], 0m, 0m, 0m, false, "Korpa je prazna.");
        }

        var variantIds = items.Select(i => i.VariantId).Distinct().ToList();
        var variants = await db.ProductVariants
            .Include(v => v.Product)
            .Where(v => variantIds.Contains(v.Id) && v.IsActive)
            .ToDictionaryAsync(v => v.Id, ct);

        var movements = await db.StockMovements.Where(m => variantIds.Contains(m.VariantId)).ToListAsync(ct);
        var reservations = await db.StockReservations.Where(r => variantIds.Contains(r.VariantId)).ToListAsync(ct);
        var offers = await db.SupplierOffers.Where(o => o.VariantId.HasValue && variantIds.Contains(o.VariantId.Value)).ToListAsync(ct);
        var suppliers = await db.Suppliers.ToListAsync(ct);
        var now = DateTimeOffset.UtcNow;

        var lines = new List<CheckoutQuoteLine>();
        string? firstError = null;
        decimal totalCostRsd = 0m;

        foreach (var req in items)
        {
            if (req.Quantity <= 0)
            {
                firstError ??= "Količina mora biti najmanje 1.";
                continue;
            }

            if (!variants.TryGetValue(req.VariantId, out var variant) || variant.Product?.Status != ProductStatus.Published)
            {
                firstError ??= "Izabrani artikal više nije dostupan u katalogu.";
                continue;
            }

            var proj = inventoryService.ProjectAvailability(variant, movements, reservations, offers, suppliers, now);
            var maxOrderable = proj.OwnSellableQty > 0 ? proj.OwnSellableQty : proj.BestSupplierSellableQty;
            var available = proj.IsOrderable && req.Quantity <= maxOrderable;

            if (!available && firstError is null)
            {
                firstError = $"Tražena količina ({req.Quantity}) za '{variant.Product.Name}' nije trenutno raspoloživa (dostupno: {maxOrderable}).";
            }

            var lineTotal = decimal.Round(variant.CurrentSellingPriceRsd * req.Quantity, 2);
            totalCostRsd += decimal.Round(variant.CurrentCostPriceRsd * req.Quantity, 2);

            lines.Add(new CheckoutQuoteLine(
                VariantId: variant.Id,
                InternalSku: variant.InternalSku,
                ProductName: variant.Product.Name,
                Quantity: req.Quantity,
                UnitPriceRsd: variant.CurrentSellingPriceRsd,
                LineTotalRsd: lineTotal,
                FulfillmentSource: proj.FulfillmentSource,
                PublicAvailabilityLabel: proj.PublicStatusLabel,
                IsAvailable: available));
        }

        var subtotal = lines.Sum(l => l.LineTotalRsd);
        decimal discountRsd = 0m;
        string? appliedCoupon = null;
        string? couponMsg = null;

        if (!string.IsNullOrWhiteSpace(couponCode) && subtotal > 0m)
        {
            var cleanCode = couponCode.Trim().ToUpperInvariant();
            var coupon = await db.Coupons.FirstOrDefaultAsync(c => c.Code == cleanCode, ct);
            var promoService = new PromotionAndReturnService();
            var eval = promoService.EvaluateCoupon(coupon, subtotal, totalCostRsd, minOrderProfitFloorRsd: 350m, now);
            couponMsg = eval.Message;
            if (eval.IsValid)
            {
                discountRsd = eval.DiscountRsd;
                appliedCoupon = eval.CouponCode;
            }
        }

        var discountedSubtotal = Math.Max(0m, subtotal - discountRsd);
        var shipping = discountedSubtotal == 0m ? 0m : (discountedSubtotal >= 12000m ? 0m : 490m);
        var total = discountedSubtotal + shipping;

        return new CheckoutQuoteResponse(
            Lines: lines,
            SubtotalRsd: subtotal,
            ShippingCostRsd: shipping,
            TotalRsd: total,
            CanProceed: firstError is null && lines.Count > 0,
            ValidationError: firstError,
            DiscountRsd: discountRsd,
            AppliedCouponCode: appliedCoupon,
            CouponMessage: couponMsg);
    }

    public async Task<CheckoutConfirmResult> ConfirmOrderAsync(
        CheckoutConfirmRequest request,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.IdempotencyKey))
        {
            return new CheckoutConfirmResult(false, false, "MISSING_IDEMPOTENCY_KEY", "Nedostaje identifikator zahteva.", null);
        }

        await CheckoutLock.WaitAsync(ct);
        try
        {
            // AT-01: Idempotency check - repeated click returns existing order without duplicating reservations
            var existingOrder = await db.Orders
                .Include(o => o.Items)
                .FirstOrDefaultAsync(o => o.IdempotencyKey == request.IdempotencyKey.Trim(), ct);

            if (existingOrder is not null)
            {
                return new CheckoutConfirmResult(true, true, null, "Porudžbina je već primljena.", existingOrder);
            }

            var quote = await QuoteAsync(request.Items, ct, request.CouponCode);
            if (!quote.CanProceed)
            {
                return new CheckoutConfirmResult(false, false, "PRODUCT_OUT_OF_STOCK", quote.ValidationError ?? "Artikal nije na stanju.", null);
            }

            string normalizedPhone;
            try
            {
                normalizedPhone = SerbianTextNormalizer.NormalizePhoneE164(request.CustomerPhone);
            }
            catch (Exception ex)
            {
                return new CheckoutConfirmResult(false, false, "ADDRESS_INVALID", ex.Message, null);
            }

            var cutoff24h = DateTimeOffset.UtcNow.AddHours(-24);
            var recentPhoneOrders = await db.Orders
                .CountAsync(o => o.CustomerPhoneE164 == normalizedPhone && o.CreatedAt >= cutoff24h, ct);

            var riskRecords = await db.CustomerRiskRecords.ToListAsync(ct);
            var risk = riskEvaluator.EvaluateOrder(
                request.CustomerPhone,
                request.CustomerEmail,
                request.ShippingPostalCode,
                quote.TotalRsd,
                riskRecords,
                recentPhoneOrders);

            var orderSeq = await db.Orders.CountAsync(ct) + 1;
            var orderNumber = $"ORD-{DateTimeOffset.UtcNow:yyyyMMdd}-{orderSeq:D4}";
            var lookupToken = Guid.NewGuid().ToString("N");

            var paymentMethod = string.Equals(request.PreferredPaymentMethod, "BankTransfer", StringComparison.OrdinalIgnoreCase)
                ? PaymentMethod.BankTransfer
                : PaymentMethod.CashOnDelivery;

            var courierAndPayment = new CourierAndPaymentService();
            var ipsQrPayload = courierAndPayment.GenerateNbsIpsQrPayload(orderNumber, quote.TotalRsd);

            if (!string.IsNullOrWhiteSpace(quote.AppliedCouponCode))
            {
                var usedCoupon = await db.Coupons.FirstOrDefaultAsync(c => c.Code == quote.AppliedCouponCode, ct);
                if (usedCoupon is not null)
                {
                    usedCoupon.CurrentUses++;
                }
            }

            var order = new Order
            {
                OrderNumber = orderNumber,
                IdempotencyKey = request.IdempotencyKey.Trim(),
                PublicLookupTokenHash = SerbianTextNormalizer.ComputeSha256Hash(lookupToken),
                Status = risk.RecommendedInitialStatus,
                // AT-10: COD is never automatically marked Paid at order creation!
                PaymentStatus = PaymentStatus.Pending,
                FulfillmentStatus = FulfillmentStatus.NotStarted,
                PaymentMethod = paymentMethod,
                CustomerFullName = request.CustomerFullName.Trim(),
                CustomerPhoneE164 = risk.NormalizedPhoneE164,
                CustomerEmail = request.CustomerEmail.Trim(),
                ShippingStreet = request.ShippingStreet.Trim(),
                ShippingCity = request.ShippingCity.Trim(),
                ShippingPostalCode = request.ShippingPostalCode.Trim(),
                CustomerNote = request.CustomerNote?.Trim(),
                VerificationReason = risk.VerificationReason,
                SubtotalRsd = quote.SubtotalRsd,
                DiscountRsd = quote.DiscountRsd,
                CouponCode = quote.AppliedCouponCode,
                ShippingCostRsd = quote.ShippingCostRsd,
                TotalRsd = quote.TotalRsd,
                IpsQrPayload = ipsQrPayload
            };

            var variantsMap = await db.ProductVariants
                .Where(v => quote.Lines.Select(l => l.VariantId).Contains(v.Id))
                .ToDictionaryAsync(v => v.Id, ct);

            foreach (var line in quote.Lines)
            {
                var v = variantsMap[line.VariantId];
                order.Items.Add(new OrderItem
                {
                    OrderId = order.Id,
                    VariantId = line.VariantId,
                    ProductNameSnapshot = line.ProductName,
                    SkuSnapshot = line.InternalSku,
                    Quantity = line.Quantity,
                    UnitPriceRsd = line.UnitPriceRsd,
                    UnitCostSnapshotRsd = v.CurrentCostPriceRsd,
                    LineTotalRsd = line.LineTotalRsd,
                    FulfillmentSource = line.FulfillmentSource
                });

                // AT-02: Reserve physical stock atomically when fulfilled from OwnStock
                if (line.FulfillmentSource == "OwnStock")
                {
                    db.StockReservations.Add(new StockReservation
                    {
                        VariantId = line.VariantId,
                        OrderId = order.Id,
                        Quantity = line.Quantity,
                        Status = StockReservationStatus.Active,
                        ExpiresAt = DateTimeOffset.UtcNow.AddHours(48)
                    });
                }
            }

            // AT-14: Write Outbox event and rendered transactional email in the same transaction
            var emailRenderer = new TransactionalEmailRenderer();
            var renderedEmail = emailRenderer.RenderOrderPlacedEmail(order);
            db.NotificationLogs.Add(new NotificationLog
            {
                Channel = "Email",
                TemplateName = renderedEmail.TemplateName,
                Recipient = renderedEmail.Recipient,
                Subject = renderedEmail.Subject,
                BodyHtml = renderedEmail.BodyHtml,
                ReferenceId = renderedEmail.ReferenceId,
                Status = "QueuedInOutbox"
            });

            db.OutboxMessages.Add(new OutboxMessage
            {
                EventType = "OrderPlaced",
                PayloadJson = JsonSerializer.Serialize(new
                {
                    order.Id,
                    order.OrderNumber,
                    order.CustomerEmail,
                    order.TotalRsd,
                    order.Status
                })
            });

            db.AuditLogs.Add(new AuditLog
            {
                Actor = "guest-checkout",
                Action = "OrderCreated",
                EntityType = nameof(Order),
                EntityId = order.OrderNumber,
                AfterSummary = $"Total={order.TotalRsd:N2} RSD, Status={order.Status}, Payment={order.PaymentStatus}"
            });

            db.Orders.Add(order);
            await db.SaveChangesAsync(ct);

            return new CheckoutConfirmResult(true, false, null, $"Porudžbina {order.OrderNumber} je uspešno kreirana.", order);
        }
        finally
        {
            CheckoutLock.Release();
        }
    }

    /// <summary>
    /// Cancels an order, releases active stock reservations, and records audit trail (AT-09).
    /// </summary>
    public async Task<bool> CancelOrderAsync(Guid orderId, string actor, string reason, CancellationToken ct = default)
    {
        var order = await db.Orders.FirstOrDefaultAsync(o => o.Id == orderId, ct);
        if (order is null || order.Status == OrderStatus.Cancelled)
            return false;

        var oldStatus = order.Status;
        order.Status = OrderStatus.Cancelled;
        order.FulfillmentStatus = FulfillmentStatus.Exception;
        order.UpdatedAt = DateTimeOffset.UtcNow;

        var activeReservations = await db.StockReservations
            .Where(r => r.OrderId == orderId && r.Status == StockReservationStatus.Active)
            .ToListAsync(ct);

        foreach (var res in activeReservations)
        {
            res.Status = StockReservationStatus.Released;
            res.UpdatedAt = DateTimeOffset.UtcNow;
        }

        db.AuditLogs.Add(new AuditLog
        {
            Actor = actor,
            Action = "OrderCancelled",
            EntityType = nameof(Order),
            EntityId = order.OrderNumber,
            BeforeSummary = oldStatus.ToString(),
            AfterSummary = OrderStatus.Cancelled.ToString(),
            Reason = reason
        });

        await db.SaveChangesAsync(ct);
        return true;
    }
}

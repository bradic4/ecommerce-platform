using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Xml.Linq;
using Ecommerce.Application.Services;
using Ecommerce.Domain.Common;
using Ecommerce.Domain.Entities;
using Ecommerce.Domain.Enums;
using Ecommerce.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Ecommerce.Infrastructure.Services;

public record PriceSimulationRow(
    Guid VariantId,
    string InternalSku,
    string ProductName,
    decimal CostRsd,
    decimal CurrentSellingPriceRsd,
    decimal SimulatedSellingPriceRsd,
    decimal MarkupPercent,
    decimal GrossMarginPercent,
    decimal NetContributionRsd,
    bool IsBelowFloor,
    string RuleExplanation);

public class AdminOperationsService(
    EcommerceDbContext db,
    SupplierFeedService feedService,
    PricingEngine pricingEngine)
{
    /// <summary>
    /// Parses CSV or XML supplier feed text into normalized rows (Section 09.1).
    /// CSV format: SupplierSku;ProductName;Ean;Brand;PurchasePrice;Quantity
    /// </summary>
    public IReadOnlyList<SupplierFeedRowInput> ParseRawFeedText(string rawContent, string format = "CSV")
    {
        if (string.IsNullOrWhiteSpace(rawContent))
            return [];

        if (string.Equals(format, "XML", StringComparison.OrdinalIgnoreCase))
        {
            var doc = XDocument.Parse(rawContent);
            return doc.Descendants("item")
                .Select(x => new SupplierFeedRowInput(
                    SupplierSku: (string?)x.Element("sku") ?? string.Empty,
                    ProductName: (string?)x.Element("name") ?? string.Empty,
                    Ean: (string?)x.Element("ean"),
                    Brand: (string?)x.Element("brand"),
                    RawPurchasePrice: (string?)x.Element("price") ?? "0",
                    Quantity: int.TryParse((string?)x.Element("qty"), out var q) ? q : 0,
                    Currency: (string?)x.Element("currency") ?? "RSD"))
                .ToList();
        }

        var rows = new List<SupplierFeedRowInput>();
        var lines = rawContent.Split(['\r', '\n'], StringSplitOptions.RemoveEmptyEntries);

        foreach (var line in lines)
        {
            var trimmed = line.Trim();
            if (string.IsNullOrEmpty(trimmed) || trimmed.StartsWith('#') || trimmed.StartsWith("SupplierSku", StringComparison.OrdinalIgnoreCase))
                continue;

            var parts = trimmed.Split(';');
            if (parts.Length < 6)
                continue;

            rows.Add(new SupplierFeedRowInput(
                SupplierSku: parts[0].Trim(),
                ProductName: parts[1].Trim(),
                Ean: string.IsNullOrWhiteSpace(parts[2]) ? null : parts[2].Trim(),
                Brand: string.IsNullOrWhiteSpace(parts[3]) ? null : parts[3].Trim(),
                RawPurchasePrice: parts[4].Trim(),
                Quantity: int.TryParse(parts[5].Trim(), out var qty) ? qty : -1,
                Currency: parts.Length > 6 && !string.IsNullOrWhiteSpace(parts[6]) ? parts[6].Trim() : "RSD"));
        }

        return rows;
    }

    /// <summary>
    /// Runs supplier import in DryRun or Apply mode, records ImportRun, AuditLog, and Outbox cache invalidation (Section 09 &amp; 25.6).
    /// </summary>
    public async Task<FeedImportPreview> ExecuteFeedImportAsync(
        Guid supplierId,
        string rawContent,
        string format,
        FeedImportOptions options,
        string actor = "vlasnik",
        CancellationToken ct = default)
    {
        var rows = ParseRawFeedText(rawContent, format);
        var existingOffers = await db.SupplierOffers.ToListAsync(ct);
        var canonicalVariants = await db.ProductVariants.Include(v => v.Product).ToListAsync(ct);

        var preview = feedService.ProcessFeed(supplierId, rows, existingOffers, canonicalVariants, options);

        if (!options.IsDryRun && preview.Status == ImportRunStatus.Applied)
        {
            // Sync newly added offers into DbSet
            foreach (var offer in existingOffers)
            {
                if (db.Entry(offer).State == EntityState.Detached)
                    db.SupplierOffers.Add(offer);
            }

            // Recalculate selling prices for matched variants whose supplier cost updated
            var rules = await db.PricingRules.Where(r => r.IsActive).ToListAsync(ct);
            var affectedTags = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "catalog" };

            foreach (var variant in canonicalVariants)
            {
                var bestActiveOffer = existingOffers
                    .Where(o => o.VariantId == variant.Id && o.IsActiveInFeed && !o.NeedsManualReview)
                    .OrderBy(o => o.PurchasePrice)
                    .FirstOrDefault();

                if (bestActiveOffer is not null && bestActiveOffer.PurchasePrice > 0m)
                {
                    var calc = pricingEngine.CalculatePrice(
                        bestActiveOffer.PurchasePrice,
                        rules,
                        variant.ProductId,
                        variant.Product?.CategoryId,
                        bestActiveOffer.SupplierId,
                        variant.ManualPriceOverrideRsd);

                    if (calc.SellingPriceRsd != variant.CurrentSellingPriceRsd || calc.CostPriceRsd != variant.CurrentCostPriceRsd)
                    {
                        var oldPrice = variant.CurrentSellingPriceRsd;
                        variant.CurrentCostPriceRsd = calc.CostPriceRsd;
                        variant.CurrentSellingPriceRsd = calc.SellingPriceRsd;
                        variant.AppliedPricingRuleSummary = calc.RuleExplanation;
                        variant.UpdatedAt = DateTimeOffset.UtcNow;

                        db.PriceRecords.Add(new PriceRecord
                        {
                            VariantId = variant.Id,
                            SupplierOfferId = bestActiveOffer.Id,
                            CostSnapshotRsd = calc.CostPriceRsd,
                            OldSellingPriceRsd = oldPrice,
                            NewSellingPriceRsd = calc.SellingPriceRsd,
                            MarkupPercent = calc.MarkupPercent,
                            GrossMarginPercent = calc.GrossMarginPercent,
                            NetContributionFloorRsd = calc.NetContributionRsd,
                            RuleDescription = calc.RuleExplanation,
                            ChangedBy = actor
                        });

                        if (variant.Product is not null)
                            affectedTags.Add($"product:{variant.Product.Slug}");
                    }
                }
            }

            db.OutboxMessages.Add(new OutboxMessage
            {
                EventType = "CatalogChanged",
                PayloadJson = JsonSerializer.Serialize(new { tags = affectedTags.ToArray() })
            });

            db.AuditLogs.Add(new AuditLog
            {
                Actor = actor,
                Action = "SupplierFeedApplied",
                EntityType = nameof(Supplier),
                EntityId = supplierId.ToString(),
                AfterSummary = $"Added={preview.AddedCount}, Updated={preview.UpdatedCount}, Quarantined={preview.QuarantinedRows.Count}"
            });
        }

        db.ImportRuns.Add(new ImportRun
        {
            SupplierId = supplierId,
            FeedFormat = format,
            IsDryRun = options.IsDryRun,
            IsDeltaFeed = options.IsDeltaFeed,
            Status = preview.Status,
            TotalRows = preview.TotalRows,
            AddedCount = preview.AddedCount,
            UpdatedCount = preview.UpdatedCount,
            MissingInFeedCount = preview.MissingFromFeedCount,
            QuarantinedCount = preview.QuarantinedRows.Count,
            SafetyBlockReason = preview.SafetyBlockReason,
            SummaryReportJson = JsonSerializer.Serialize(preview.QuarantinedRows)
        });

        await db.SaveChangesAsync(ct);
        return preview;
    }

    /// <summary>
    /// Simulates or applies pricing rules across all active variants (Section 10 &amp; 18).
    /// </summary>
    public async Task<IReadOnlyList<PriceSimulationRow>> SimulateOrApplyPricingAsync(
        PricingRule trialRule,
        bool applyChanges,
        string actor = "vlasnik",
        CancellationToken ct = default)
    {
        var variants = await db.ProductVariants
            .Include(v => v.Product)
            .Where(v => v.IsActive)
            .OrderBy(v => v.InternalSku)
            .ToListAsync(ct);

        var rows = new List<PriceSimulationRow>();
        var affectedTags = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "catalog" };

        foreach (var v in variants)
        {
            if (v.CurrentCostPriceRsd <= 0m)
                continue;

            var calc = pricingEngine.CalculatePrice(
                v.CurrentCostPriceRsd,
                [trialRule],
                v.ProductId,
                v.Product?.CategoryId,
                null,
                v.ManualPriceOverrideRsd);

            rows.Add(new PriceSimulationRow(
                VariantId: v.Id,
                InternalSku: v.InternalSku,
                ProductName: v.Product?.Name ?? v.Title,
                CostRsd: v.CurrentCostPriceRsd,
                CurrentSellingPriceRsd: v.CurrentSellingPriceRsd,
                SimulatedSellingPriceRsd: calc.SellingPriceRsd,
                MarkupPercent: calc.MarkupPercent,
                GrossMarginPercent: calc.GrossMarginPercent,
                NetContributionRsd: calc.NetContributionRsd,
                IsBelowFloor: calc.IsBelowProfitabilityFloor,
                RuleExplanation: calc.RuleExplanation));

            if (applyChanges && calc.SellingPriceRsd != v.CurrentSellingPriceRsd)
            {
                var oldPrice = v.CurrentSellingPriceRsd;
                v.CurrentSellingPriceRsd = calc.SellingPriceRsd;
                v.AppliedPricingRuleSummary = calc.RuleExplanation;
                v.UpdatedAt = DateTimeOffset.UtcNow;

                db.PriceRecords.Add(new PriceRecord
                {
                    VariantId = v.Id,
                    CostSnapshotRsd = v.CurrentCostPriceRsd,
                    OldSellingPriceRsd = oldPrice,
                    NewSellingPriceRsd = calc.SellingPriceRsd,
                    MarkupPercent = calc.MarkupPercent,
                    GrossMarginPercent = calc.GrossMarginPercent,
                    NetContributionFloorRsd = calc.NetContributionRsd,
                    RuleDescription = calc.RuleExplanation,
                    ChangedBy = actor
                });

                if (v.Product is not null)
                    affectedTags.Add($"product:{v.Product.Slug}");
            }
        }

        if (applyChanges)
        {
            var existingGlobal = await db.PricingRules.FirstOrDefaultAsync(r => r.Scope == PricingRuleScope.Global && r.IsActive, ct);
            if (existingGlobal is not null)
            {
                existingGlobal.MarkupMultiplier = trialRule.MarkupMultiplier;
                existingGlobal.FixedHandlingFeeRsd = trialRule.FixedHandlingFeeRsd;
                existingGlobal.MinGrossMarginPercent = trialRule.MinGrossMarginPercent;
                existingGlobal.MinProfitFloorRsd = trialRule.MinProfitFloorRsd;
                existingGlobal.ExpectedUnclaimedRate = trialRule.ExpectedUnclaimedRate;
                existingGlobal.EstimatedTwoWayShippingCostRsd = trialRule.EstimatedTwoWayShippingCostRsd;
                existingGlobal.RoundToWholeTenRsd = trialRule.RoundToWholeTenRsd;
                existingGlobal.UpdatedAt = DateTimeOffset.UtcNow;
            }

            db.OutboxMessages.Add(new OutboxMessage
            {
                EventType = "CatalogChanged",
                PayloadJson = JsonSerializer.Serialize(new { tags = affectedTags.ToArray() })
            });

            db.AuditLogs.Add(new AuditLog
            {
                Actor = actor,
                Action = "PricingRulesApplied",
                EntityType = nameof(PricingRule),
                EntityId = "Global",
                AfterSummary = $"Multiplier={trialRule.MarkupMultiplier:N2}, MinFloor={trialRule.MinProfitFloorRsd:N0} RSD"
            });

            await db.SaveChangesAsync(ct);
        }

        return rows;
    }

    /// <summary>
    /// Adjusts own physical stock with mandatory reason and audit log (Section 05 &amp; 11.1).
    /// </summary>
    public async Task AdjustOwnStockAsync(
        Guid variantId,
        int quantityDelta,
        string reason,
        string actor = "operater",
        CancellationToken ct = default)
    {
        if (quantityDelta == 0)
            return;
        if (string.IsNullOrWhiteSpace(reason))
            throw new ArgumentException("Razlog korekcije zaliha je obavezan.", nameof(reason));

        var ownLoc = await db.InventoryLocations.FirstOrDefaultAsync(l => l.Type == InventoryLocationType.Own, ct)
                     ?? new InventoryLocation { Name = "Glavni magacin", Type = InventoryLocationType.Own };

        if (db.Entry(ownLoc).State == EntityState.Detached)
            db.InventoryLocations.Add(ownLoc);

        var variant = await db.ProductVariants.Include(v => v.Product).FirstOrDefaultAsync(v => v.Id == variantId, ct)
                      ?? throw new InvalidOperationException("Varijanta nije pronađena.");

        db.StockMovements.Add(new StockMovement
        {
            VariantId = variantId,
            LocationId = ownLoc.Id,
            QuantityDelta = quantityDelta,
            Reason = reason.Trim(),
            Actor = actor
        });

        db.AuditLogs.Add(new AuditLog
        {
            Actor = actor,
            Action = "StockAdjusted",
            EntityType = nameof(ProductVariant),
            EntityId = variant.InternalSku,
            AfterSummary = $"Delta={quantityDelta:+#;-#;0}",
            Reason = reason.Trim()
        });

        if (variant.Product is not null)
        {
            db.OutboxMessages.Add(new OutboxMessage
            {
                EventType = "CatalogChanged",
                PayloadJson = JsonSerializer.Serialize(new { tags = new[] { "catalog", $"product:{variant.Product.Slug}" } })
            });
        }

        await db.SaveChangesAsync(ct);
    }

    /// <summary>
    /// Renames a product slug and records a 301 RedirectRule without chains/loops (Section 14.2, AT-11).
    /// </summary>
    public async Task RenameProductSlugAsync(
        Guid productId,
        string newRawSlug,
        string actor = "vlasnik",
        CancellationToken ct = default)
    {
        var product = await db.Products.FirstOrDefaultAsync(p => p.Id == productId, ct)
                      ?? throw new InvalidOperationException("Proizvod nije pronađen.");

        var cleanNewSlug = SerbianTextNormalizer.Slugify(newRawSlug);
        if (string.IsNullOrWhiteSpace(cleanNewSlug) || cleanNewSlug == product.Slug)
            return;

        var oldPath = $"/proizvod/{product.Slug}";
        var newPath = $"/proizvod/{cleanNewSlug}";

        // Prevent redirect chains: update any existing redirect pointing to oldPath so it points directly to newPath
        var chainedRedirects = await db.RedirectRules.Where(r => r.NewPath == oldPath).ToListAsync(ct);
        foreach (var chained in chainedRedirects)
        {
            chained.NewPath = newPath;
            chained.UpdatedAt = DateTimeOffset.UtcNow;
        }

        // Remove self-redirect if renaming back to a previously used slug
        var reverseRule = await db.RedirectRules.FirstOrDefaultAsync(r => r.OldPath == newPath, ct);
        if (reverseRule is not null)
        {
            db.RedirectRules.Remove(reverseRule);
        }

        if (!await db.RedirectRules.AnyAsync(r => r.OldPath == oldPath, ct))
        {
            db.RedirectRules.Add(new RedirectRule
            {
                OldPath = oldPath,
                NewPath = newPath,
                StatusCode = 301
            });
        }

        var oldSlug = product.Slug;
        product.Slug = cleanNewSlug;
        product.UpdatedAt = DateTimeOffset.UtcNow;

        db.AuditLogs.Add(new AuditLog
        {
            Actor = actor,
            Action = "ProductSlugRenamed",
            EntityType = nameof(Product),
            EntityId = product.Id.ToString(),
            BeforeSummary = oldPath,
            AfterSummary = newPath
        });

        db.OutboxMessages.Add(new OutboxMessage
        {
            EventType = "CatalogChanged",
            PayloadJson = JsonSerializer.Serialize(new { tags = new[] { "catalog", $"product:{oldSlug}", $"product:{cleanNewSlug}" } })
        });

        await db.SaveChangesAsync(ct);
    }

    /// <summary>
    /// Marks an order as shipped with carrier, tracking number, and fiscal document ref (Section 05.1 &amp; 13, AT-15).
    /// </summary>
    public async Task ShipOrderAsync(
        Guid orderId,
        string carrier,
        string trackingNumber,
        string fiscalDocRef,
        string actor = "operater",
        CancellationToken ct = default)
    {
        var order = await db.Orders.Include(o => o.Shipments).FirstOrDefaultAsync(o => o.Id == orderId, ct)
                    ?? throw new InvalidOperationException("Porudžbina nije pronađena.");

        var oldStatus = order.Status;
        order.Status = OrderStatus.Confirmed;
        order.FulfillmentStatus = FulfillmentStatus.Shipped;
        order.FiscalDocumentRef = fiscalDocRef.Trim();
        order.FiscalStatus = "Issued";
        order.UpdatedAt = DateTimeOffset.UtcNow;

        var reservations = await db.StockReservations
            .Where(r => r.OrderId == orderId && r.Status == StockReservationStatus.Active)
            .ToListAsync(ct);

        var ownLoc = await db.InventoryLocations.FirstOrDefaultAsync(l => l.Type == InventoryLocationType.Own, ct);
        foreach (var res in reservations)
        {
            res.Status = StockReservationStatus.Committed;
            if (ownLoc is not null)
            {
                db.StockMovements.Add(new StockMovement
                {
                    VariantId = res.VariantId,
                    LocationId = ownLoc.Id,
                    QuantityDelta = -res.Quantity,
                    Reason = $"Otprema porudžbine {order.OrderNumber}",
                    ReferenceId = order.OrderNumber,
                    Actor = actor
                });
            }
        }

        var shipment = new Shipment
        {
            OrderId = order.Id,
            Carrier = carrier.Trim(),
            TrackingNumber = trackingNumber.Trim(),
            ShippedBy = "Own",
            CarrierAccountOwner = "Own",
            ShippingCostRsd = order.ShippingCostRsd,
            CodAmountRsd = order.TotalRsd,
            Status = "Shipped",
            ShippedAt = DateTimeOffset.UtcNow
        };
        db.Shipments.Add(shipment);

        var emailRenderer = new TransactionalEmailRenderer();
        var shippedEmail = emailRenderer.RenderOrderShippedEmail(order, shipment);
        db.NotificationLogs.Add(new NotificationLog
        {
            Channel = "Email",
            TemplateName = shippedEmail.TemplateName,
            Recipient = shippedEmail.Recipient,
            Subject = shippedEmail.Subject,
            BodyHtml = shippedEmail.BodyHtml,
            ReferenceId = shippedEmail.ReferenceId,
            Status = "Sent"
        });

        db.AuditLogs.Add(new AuditLog
        {
            Actor = actor,
            Action = "OrderShipped",
            EntityType = nameof(Order),
            EntityId = order.OrderNumber,
            BeforeSummary = oldStatus.ToString(),
            AfterSummary = $"Shipped ({carrier} #{trackingNumber}, Fiscal={fiscalDocRef})"
        });

        await db.SaveChangesAsync(ct);
    }

    /// <summary>
    /// Records an unclaimed COD parcel return: releases/restores stock and increments CustomerRiskRecord (Section 25.2 &amp; 25.3, AT-17).
    /// </summary>
    public async Task MarkOrderUnclaimedReturnAsync(
        Guid orderId,
        decimal returnShippingCostRsd,
        string actor = "operater",
        CancellationToken ct = default)
    {
        var order = await db.Orders.Include(o => o.Shipments).FirstOrDefaultAsync(o => o.Id == orderId, ct)
                    ?? throw new InvalidOperationException("Porudžbina nije pronađena.");

        order.Status = OrderStatus.Cancelled;
        order.FulfillmentStatus = FulfillmentStatus.Returned;
        order.UpdatedAt = DateTimeOffset.UtcNow;

        foreach (var sh in order.Shipments)
        {
            sh.Status = "UnclaimedReturned";
            sh.ReturnShippingCostRsd = returnShippingCostRsd;
            sh.UnclaimedAt = DateTimeOffset.UtcNow;
        }

        var phoneHash = SerbianTextNormalizer.ComputeSha256Hash(order.CustomerPhoneE164);
        var emailHash = SerbianTextNormalizer.ComputeSha256Hash(order.CustomerEmail);

        var risk = await db.CustomerRiskRecords.FirstOrDefaultAsync(r => r.PhoneHash == phoneHash, ct);
        if (risk is null)
        {
            db.CustomerRiskRecords.Add(new CustomerRiskRecord
            {
                PhoneHash = phoneHash,
                EmailHash = emailHash,
                UnclaimedCount = 1,
                LastIncidentAt = DateTimeOffset.UtcNow,
                Note = $"Nepreuzeta pošiljka {order.OrderNumber}"
            });
        }
        else
        {
            risk.UnclaimedCount++;
            risk.LastIncidentAt = DateTimeOffset.UtcNow;
            risk.Note = $"{risk.Note}; {order.OrderNumber}";
        }

        db.AuditLogs.Add(new AuditLog
        {
            Actor = actor,
            Action = "OrderMarkedUnclaimed",
            EntityType = nameof(Order),
            EntityId = order.OrderNumber,
            AfterSummary = $"Unclaimed return cost={returnShippingCostRsd:N2} RSD; CustomerRisk updated"
        });

        await db.SaveChangesAsync(ct);
    }

    /// <summary>
    /// Reconciles courier COD remittance payout with delivered/shipped COD orders (Section 25.2, AT-18).
    /// </summary>
    public async Task<CodRemittance> RecordCodRemittanceAsync(
        Guid orderId,
        decimal receivedAmountRsd,
        string bankReference,
        string actor = "vlasnik",
        CancellationToken ct = default)
    {
        var order = await db.Orders.FirstOrDefaultAsync(o => o.Id == orderId, ct)
                    ?? throw new InvalidOperationException("Porudžbina nije pronađena.");

        var isExactMatch = decimal.Round(receivedAmountRsd, 2) == decimal.Round(order.TotalRsd, 2);
        if (isExactMatch)
        {
            order.PaymentStatus = PaymentStatus.Paid;
            order.Status = OrderStatus.Completed;
            order.FulfillmentStatus = FulfillmentStatus.Delivered;
        }

        var remittance = new CodRemittance
        {
            Carrier = "PostExpress",
            PeriodFrom = order.CreatedAt,
            PeriodTo = DateTimeOffset.UtcNow,
            ExpectedAmountRsd = order.TotalRsd,
            ReceivedAmountRsd = receivedAmountRsd,
            ReceivedAt = DateTimeOffset.UtcNow,
            BankReference = bankReference.Trim(),
            Status = isExactMatch ? CodRemittanceStatus.Matched : CodRemittanceStatus.Discrepancy
        };

        db.CodRemittances.Add(remittance);
        db.AuditLogs.Add(new AuditLog
        {
            Actor = actor,
            Action = "CodRemittanceRecorded",
            EntityType = nameof(Order),
            EntityId = order.OrderNumber,
            AfterSummary = $"Expected={order.TotalRsd:N2}, Received={receivedAmountRsd:N2}, Status={remittance.Status}"
        });

        await db.SaveChangesAsync(ct);
        return remittance;
    }

    /// <summary>
    /// Creates a SupplierPurchaseOrder (PO) for confirmed order items sourced from virtual supplier stock (Section 11, 12.1, 25.2).
    /// </summary>
    public async Task<SupplierPurchaseOrder> GenerateSupplierPurchaseOrderAsync(
        Guid orderId,
        string actor = "operater",
        CancellationToken ct = default)
    {
        var order = await db.Orders.Include(o => o.Items).FirstOrDefaultAsync(o => o.Id == orderId, ct)
                    ?? throw new InvalidOperationException("Porudžbina nije pronađena.");

        var primarySupplier = await db.Suppliers.FirstOrDefaultAsync(s => s.IsActive, ct)
                              ?? throw new InvalidOperationException("Nema aktivnog dobavljača.");

        var totalCost = order.Items.Sum(i => i.UnitCostSnapshotRsd * i.Quantity);
        var poNumber = $"PO-{DateTimeOffset.UtcNow:yyyyMMdd}-{Random.Shared.Next(100, 999)}";

        var po = new SupplierPurchaseOrder
        {
            PoNumber = poNumber,
            SupplierId = primarySupplier.Id,
            SupplierName = primarySupplier.Name,
            CustomerOrderId = order.Id,
            CustomerOrderNumber = order.OrderNumber,
            FulfillmentModel = primarySupplier.DefaultFulfillmentModel,
            Status = SupplierPoStatus.SentToSupplier,
            TotalEstimatedCostRsd = totalCost,
            LinesSummaryJson = JsonSerializer.Serialize(order.Items.Select(i => new
            {
                i.SkuSnapshot,
                i.ProductNameSnapshot,
                i.Quantity,
                i.UnitCostSnapshotRsd
            }))
        };

        order.FulfillmentStatus = FulfillmentStatus.Sourcing;
        db.SupplierPurchaseOrders.Add(po);

        db.AuditLogs.Add(new AuditLog
        {
            Actor = actor,
            Action = "SupplierPoCreated",
            EntityType = nameof(SupplierPurchaseOrder),
            EntityId = po.PoNumber,
            AfterSummary = $"Order={order.OrderNumber}, Supplier={primarySupplier.Name}, Cost={totalCost:N2} RSD"
        });

        await db.SaveChangesAsync(ct);
        return po;
    }

    /// <summary>
    /// Processes an RMA / Warranty decision, records official 8-day response timestamp, and optionally restocks returned item to OwnStock (Section 15 &amp; 22).
    /// </summary>
    public async Task ProcessReturnDecisionAsync(
        Guid returnId,
        ReturnRequestStatus newStatus,
        string officialDecisionNote,
        bool restockToOwnInventory,
        string actor = "operater",
        CancellationToken ct = default)
    {
        var req = await db.ReturnRequests.FirstOrDefaultAsync(r => r.Id == returnId, ct)
                  ?? throw new InvalidOperationException("Reklamacija nije pronađena.");

        var oldStatus = req.Status;
        req.Status = newStatus;
        req.OfficialDecisionNote = officialDecisionNote.Trim();
        req.UpdatedAt = DateTimeOffset.UtcNow;

        if (req.RespondedAt is null && newStatus != ReturnRequestStatus.Submitted)
        {
            req.RespondedAt = DateTimeOffset.UtcNow;
        }

        if (newStatus is ReturnRequestStatus.Refunded or ReturnRequestStatus.Replaced or ReturnRequestStatus.Rejected)
        {
            req.ResolvedAt = DateTimeOffset.UtcNow;
        }

        if (restockToOwnInventory && !req.RestockedToOwnInventory)
        {
            var variant = await db.ProductVariants.FirstOrDefaultAsync(
                v => v.InternalSku == req.ProductSkuOrName || v.Title.Contains(req.ProductSkuOrName), ct)
                ?? await db.ProductVariants.FirstOrDefaultAsync(ct);

            var ownLoc = await db.InventoryLocations.FirstOrDefaultAsync(l => l.Type == InventoryLocationType.Own, ct);
            if (variant is not null && ownLoc is not null)
            {
                db.StockMovements.Add(new StockMovement
                {
                    VariantId = variant.Id,
                    LocationId = ownLoc.Id,
                    QuantityDelta = req.Quantity,
                    Reason = $"Povrat robe u magacin po reklamaciji/odustanku {req.RmaNumber}",
                    ReferenceId = req.RmaNumber,
                    Actor = actor
                });
                req.RestockedToOwnInventory = true;
            }
        }

        db.AuditLogs.Add(new AuditLog
        {
            Actor = actor,
            Action = "ReturnRequestProcessed",
            EntityType = nameof(ReturnRequest),
            EntityId = req.RmaNumber,
            BeforeSummary = oldStatus.ToString(),
            AfterSummary = $"{newStatus} (Restocked={req.RestockedToOwnInventory})",
            Reason = officialDecisionNote
        });

        await db.SaveChangesAsync(ct);
    }

    public static string ComputeWebhookHmacSignature(string secret, string timestamp, string rawJsonBody)
    {
        var keyBytes = Encoding.UTF8.GetBytes(secret);
        var payloadBytes = Encoding.UTF8.GetBytes($"{timestamp}.{rawJsonBody}");
        var hash = HMACSHA256.HashData(keyBytes, payloadBytes);
        return Convert.ToHexStringLower(hash);
    }
}

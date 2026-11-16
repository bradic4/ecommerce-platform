using Ecommerce.Application.Services;
using Ecommerce.Domain.Common;
using Ecommerce.Domain.Entities;
using Ecommerce.Domain.Enums;
using Ecommerce.Infrastructure.Persistence;
using Ecommerce.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;

namespace Ecommerce.UnitTests;

public class SpecificationAcceptanceTests
{
    private static EcommerceDbContext CreateInMemoryDb()
    {
        var options = new DbContextOptionsBuilder<EcommerceDbContext>()
            .UseInMemoryDatabase(databaseName: $"EcommerceTestDb_{Guid.NewGuid():N}")
            .Options;
        return new EcommerceDbContext(options);
    }

    [Fact]
    public async Task AT01_And_AT10_And_AT14_DoubleCheckoutClick_CreatesSingleOrder_SingleReservation_PendingCod_And_OutboxEvent()
    {
        await using var db = CreateInMemoryDb();
        await CatalogSeeder.SeedAsync(db);

        var service = new CheckoutOrderService(db, new HybridInventoryService(), new AntiFraudRiskEvaluator());
        var targetVariant = await db.ProductVariants.FirstAsync(v => v.InternalSku == "INT-AKU-18V-01");

        var request = new CheckoutConfirmRequest(
            IdempotencyKey: "IDEMP-CLICK-001",
            CustomerFullName: "Marko Petrović",
            CustomerPhone: "064 123 4567",
            CustomerEmail: "marko@example.rs",
            ShippingStreet: "Bulevar Kralja Aleksandra 73",
            ShippingCity: "Beograd",
            ShippingPostalCode: "11000",
            CustomerNote: "Pozvati pre isporuke",
            Items: [new CheckoutItemRequest(targetVariant.Id, 1)]);

        var firstResponse = await service.ConfirmOrderAsync(request);
        var secondReplayResponse = await service.ConfirmOrderAsync(request);

        Assert.True(firstResponse.Succeeded);
        Assert.False(firstResponse.WasDuplicateIdempotentReplay);

        Assert.True(secondReplayResponse.Succeeded);
        Assert.True(secondReplayResponse.WasDuplicateIdempotentReplay);
        Assert.Equal(firstResponse.Order!.OrderNumber, secondReplayResponse.Order!.OrderNumber);

        Assert.Equal(1, await db.Orders.CountAsync());
        Assert.Equal(1, await db.StockReservations.CountAsync(r => r.VariantId == targetVariant.Id));
        Assert.Equal(PaymentStatus.Pending, firstResponse.Order.PaymentStatus);
        Assert.Equal(1, await db.OutboxMessages.CountAsync(m => m.EventType == "OrderPlaced"));
    }

    [Fact]
    public async Task AT02_TwoCustomers_LastPhysicalItem_OnlyOneGetsOwnStockReservation_NoNegativeStock()
    {
        await using var db = CreateInMemoryDb();
        var cat = new Category { Name = "Alat", Slug = "alat" };
        var prod = new Product { Name = "Poslednji Komad Bušilica", Slug = "poslednji-komad", Status = ProductStatus.Published, CategoryId = cat.Id, Category = cat };
        var variant = new ProductVariant
        {
            ProductId = prod.Id,
            Product = prod,
            InternalSku = "SKU-LAST-1",
            CurrentCostPriceRsd = 5000m,
            CurrentSellingPriceRsd = 7500m,
            IsActive = true
        };
        var loc = new InventoryLocation { Name = "Magacin", Type = InventoryLocationType.Own };

        db.Categories.Add(cat);
        db.Products.Add(prod);
        db.ProductVariants.Add(variant);
        db.InventoryLocations.Add(loc);
        db.StockMovements.Add(new StockMovement { VariantId = variant.Id, LocationId = loc.Id, QuantityDelta = 1, Reason = "Samo 1 komad" });
        await db.SaveChangesAsync();

        var service = new CheckoutOrderService(db, new HybridInventoryService(), new AntiFraudRiskEvaluator());

        var buyer1 = new CheckoutConfirmRequest(
            "KEY-BUYER-1", "Kupac 1", "063111222", "k1@test.rs", "Ulica 1", "Novi Sad", "21000", null,
            [new CheckoutItemRequest(variant.Id, 1)]);

        var buyer2 = new CheckoutConfirmRequest(
            "KEY-BUYER-2", "Kupac 2", "063333444", "k2@test.rs", "Ulica 2", "Niš", "18000", null,
            [new CheckoutItemRequest(variant.Id, 1)]);

        var res1 = await service.ConfirmOrderAsync(buyer1);
        var res2 = await service.ConfirmOrderAsync(buyer2);

        Assert.True(res1.Succeeded);
        Assert.False(res2.Succeeded);
        Assert.Equal("PRODUCT_OUT_OF_STOCK", res2.ErrorCode);
        Assert.Equal(1, await db.StockReservations.CountAsync(r => r.VariantId == variant.Id && r.Status == StockReservationStatus.Active));
    }

    [Fact]
    public void AT03_FeedDecimalParser_1232_0000_ParsedAs1232_Not12Million()
    {
        var feedService = new SupplierFeedService();
        var price = feedService.ParseFeedPrice("1232.0000", decimalSeparator: '.');
        Assert.Equal(1232.00m, price);
    }

    [Fact]
    public void AT04_SameSupplierSku_AcrossTwoSuppliers_CreatesSeparateSupplierOffers_WithoutOverwrite()
    {
        var feedService = new SupplierFeedService();
        var sup1 = Guid.CreateVersion7();
        var sup2 = Guid.CreateVersion7();
        var variant = new ProductVariant { InternalSku = "INT-100", GtinEan = "8606000009999" };

        var offers = new List<SupplierOffer>();
        var opts = new FeedImportOptions(DecimalSeparator: '.', IsDeltaFeed: false, IsDryRun: false);

        feedService.ProcessFeed(
            sup1,
            [new SupplierFeedRowInput("SHARED-SKU-01", "Proizvod kod dobavljača 1", "8606000009999", "Bosch", "4500.00", 10)],
            offers,
            [variant],
            opts);

        feedService.ProcessFeed(
            sup2,
            [new SupplierFeedRowInput("SHARED-SKU-01", "Proizvod kod dobavljača 2", "8606000009999", "Bosch", "4300.00", 5)],
            offers,
            [variant],
            opts);

        Assert.Equal(2, offers.Count);
        Assert.Contains(offers, o => o.SupplierId == sup1 && o.PurchasePrice == 4500.00m);
        Assert.Contains(offers, o => o.SupplierId == sup2 && o.PurchasePrice == 4300.00m);
    }

    [Fact]
    public void AT05_And_AT06_MassDisappearanceBlockedInFullFeed_And_IgnoredInDeltaFeed()
    {
        var feedService = new SupplierFeedService();
        var supId = Guid.CreateVersion7();

        var existingOffers = Enumerable.Range(1, 10).Select(i => new SupplierOffer
        {
            SupplierId = supId,
            SupplierSku = $"SKU-{i:D2}",
            SupplierProductName = $"Artikal {i}",
            PurchasePrice = 1000m,
            SupplierReportedQty = 5,
            IsActiveInFeed = true
        }).ToList();

        var incoming7Rows = Enumerable.Range(1, 7).Select(i =>
            new SupplierFeedRowInput($"SKU-{i:D2}", $"Artikal {i}", null, null, "1000.00", 5)).ToList();

        var fullPreview = feedService.ProcessFeed(
            supId,
            incoming7Rows,
            existingOffers,
            [],
            new FeedImportOptions(IsDeltaFeed: false, IsDryRun: false, MaxMassDisappearanceRatio: 0.20m));

        Assert.Equal(ImportRunStatus.QuarantinedForReview, fullPreview.Status);
        Assert.NotNull(fullPreview.SafetyBlockReason);
        Assert.All(existingOffers, o => Assert.True(o.IsActiveInFeed));

        var deltaPreview = feedService.ProcessFeed(
            supId,
            [new SupplierFeedRowInput("SKU-01", "Artikal 1", null, null, "1050.00", 12)],
            existingOffers,
            [],
            new FeedImportOptions(IsDeltaFeed: true, IsDryRun: false));

        Assert.Equal(ImportRunStatus.Applied, deltaPreview.Status);
        Assert.Equal(12, existingOffers.First(o => o.SupplierSku == "SKU-01").SupplierReportedQty);
        Assert.Equal(5, existingOffers.First(o => o.SupplierSku == "SKU-10").SupplierReportedQty);
    }

    [Fact]
    public void AT07_InvalidPurchasePrice_KeepsOldPrice_And_QuarantinesRow()
    {
        var feedService = new SupplierFeedService();
        var supId = Guid.CreateVersion7();
        var offers = new List<SupplierOffer>
        {
            new()
            {
                SupplierId = supId,
                SupplierSku = "SKU-VALID",
                PurchasePrice = 3200m,
                SupplierReportedQty = 4,
                IsActiveInFeed = true
            }
        };

        var preview = feedService.ProcessFeed(
            supId,
            [new SupplierFeedRowInput("SKU-VALID", "Artikal", null, null, "-500.00", 4)],
            offers,
            [],
            new FeedImportOptions(IsDryRun: false));

        Assert.Equal(3200m, offers[0].PurchasePrice);
        Assert.Single(preview.QuarantinedRows);
    }

    [Fact]
    public async Task AT09_CancelOrder_ReleasesActiveStockReservation()
    {
        await using var db = CreateInMemoryDb();
        await CatalogSeeder.SeedAsync(db);

        var service = new CheckoutOrderService(db, new HybridInventoryService(), new AntiFraudRiskEvaluator());
        var variant = await db.ProductVariants.FirstAsync(v => v.InternalSku == "INT-AKU-18V-01");

        var confirmed = await service.ConfirmOrderAsync(new CheckoutConfirmRequest(
            "CANCEL-TEST-01", "Jovan Jovanović", "0659876543", "jovan@test.rs", "Glavna 10", "Zemun", "11080", null,
            [new CheckoutItemRequest(variant.Id, 2)]));

        Assert.True(confirmed.Succeeded);
        var cancelled = await service.CancelOrderAsync(confirmed.Order!.Id, "operater", "Kupac odustao telefonom");
        Assert.True(cancelled);

        var reservation = await db.StockReservations.SingleAsync(r => r.OrderId == confirmed.Order.Id);
        Assert.Equal(StockReservationStatus.Released, reservation.Status);
    }

    [Fact]
    public async Task AT11_RenamedSlug_CreatesSingle301Redirect_And_PreventsRedirectChains()
    {
        await using var db = CreateInMemoryDb();
        await CatalogSeeder.SeedAsync(db);

        var adminOps = new AdminOperationsService(db, new SupplierFeedService(), new PricingEngine());
        var product = await db.Products.FirstAsync();
        var originalPath = $"/proizvod/{product.Slug}";

        // First rename: original -> v2
        await adminOps.RenameProductSlugAsync(product.Id, "novi-model-busilice-v2");
        // Second rename: v2 -> v3 (original must point directly to v3, avoiding a chain!)
        await adminOps.RenameProductSlugAsync(product.Id, "novi-model-busilice-v3");

        var ruleFromOriginal = await db.RedirectRules.SingleAsync(r => r.OldPath == originalPath);
        Assert.Equal("/proizvod/novi-model-busilice-v3", ruleFromOriginal.NewPath);
        Assert.Equal(301, ruleFromOriginal.StatusCode);
    }

    [Fact]
    public async Task AT15_And_AT18_OperatorWorkflow_New_To_Confirmed_To_Shipped_To_CodRemittanceMatched()
    {
        await using var db = CreateInMemoryDb();
        await CatalogSeeder.SeedAsync(db);

        var checkout = new CheckoutOrderService(db, new HybridInventoryService(), new AntiFraudRiskEvaluator());
        var adminOps = new AdminOperationsService(db, new SupplierFeedService(), new PricingEngine());
        var variant = await db.ProductVariants.FirstAsync(v => v.InternalSku == "INT-BRUS-850-02");

        var created = await checkout.ConfirmOrderAsync(new CheckoutConfirmRequest(
            "WORKFLOW-01", "Milan Nikolić", "0621112223", "milan@test.rs", "Kralja Petra 15", "Beograd", "11000", null,
            [new CheckoutItemRequest(variant.Id, 1)]));

        Assert.True(created.Succeeded);
        var orderId = created.Order!.Id;

        // Ship order with tracking and fiscal reference (AT-15)
        await adminOps.ShipOrderAsync(orderId, "PostExpress", "PE-99887766-RS", "PFR-2026-000142");

        var shippedOrder = await db.Orders.Include(o => o.Shipments).FirstAsync(o => o.Id == orderId);
        Assert.Equal(FulfillmentStatus.Shipped, shippedOrder.FulfillmentStatus);
        Assert.Single(shippedOrder.Shipments);
        Assert.Equal("PE-99887766-RS", shippedOrder.Shipments[0].TrackingNumber);

        // Reconcile COD payout from courier (AT-18)
        var remittance = await adminOps.RecordCodRemittanceAsync(orderId, shippedOrder.TotalRsd, "IZVOD-105");
        Assert.Equal(CodRemittanceStatus.Matched, remittance.Status);

        var completedOrder = await db.Orders.FirstAsync(o => o.Id == orderId);
        Assert.Equal(PaymentStatus.Paid, completedOrder.PaymentStatus);
        Assert.Equal(OrderStatus.Completed, completedOrder.Status);
    }

    [Fact]
    public async Task AT17_CustomerWithUnclaimedParcelHistory_RoutedToAwaitingVerification()
    {
        await using var db = CreateInMemoryDb();
        await CatalogSeeder.SeedAsync(db);

        var normalizedPhone = SerbianTextNormalizer.NormalizePhoneE164("064 555 6666");
        db.CustomerRiskRecords.Add(new CustomerRiskRecord
        {
            PhoneHash = SerbianTextNormalizer.ComputeSha256Hash(normalizedPhone),
            UnclaimedCount = 1,
            LastIncidentAt = DateTimeOffset.UtcNow.AddDays(-20),
            Note = "Nije preuzeo pošiljku PostExpress"
        });
        await db.SaveChangesAsync();

        var service = new CheckoutOrderService(db, new HybridInventoryService(), new AntiFraudRiskEvaluator());
        var variant = await db.ProductVariants.FirstAsync(v => v.InternalSku == "INT-MUL-RMS-10");

        var result = await service.ConfirmOrderAsync(new CheckoutConfirmRequest(
            "RISK-TEST-01", "Rizični Kupac", "0645556666", "rizik@test.rs", "Cara Dušana 12", "Beograd", "11000", null,
            [new CheckoutItemRequest(variant.Id, 1)]));

        Assert.True(result.Succeeded);
        Assert.Equal(OrderStatus.AwaitingVerification, result.Order!.Status);
        Assert.Contains("nepreuzete pošiljke", result.Order.VerificationReason);
    }

    [Theory]
    [InlineData("bušilica")]
    [InlineData("busilica")]
    [InlineData("бушилица")]
    [InlineData("busilca")]
    public async Task AT19_SerbianSearch_Diacritics_Cyrillic_And_Typo_ReturnSameRelevantProducts(string query)
    {
        await using var db = CreateInMemoryDb();
        await CatalogSeeder.SeedAsync(db);

        var allProducts = await db.Products.Include(p => p.Variants).ToListAsync();
        var search = new SerbianCatalogSearchService();

        var results = search.Search(allProducts, query, maxResults: 5);
        Assert.NotEmpty(results);
        Assert.Contains(results, r => r.Product.Name.Contains("bušilica", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public async Task AT20_PricingRuleChange_UpdatesPrices_RecordsHistory_And_QueuesSignedCacheRevalidation()
    {
        await using var db = CreateInMemoryDb();
        await CatalogSeeder.SeedAsync(db);

        var adminOps = new AdminOperationsService(db, new SupplierFeedService(), new PricingEngine());
        var newRule = new PricingRule
        {
            Name = "Novo pravilo x1.45",
            Scope = PricingRuleScope.Global,
            MarkupMultiplier = 1.45m,
            FixedHandlingFeeRsd = 100m,
            MinGrossMarginPercent = 20m,
            MinProfitFloorRsd = 500m,
            ExpectedUnclaimedRate = 0.06m,
            EstimatedTwoWayShippingCostRsd = 750m,
            RoundToWholeTenRsd = true,
            IsActive = true
        };

        var rows = await adminOps.SimulateOrApplyPricingAsync(newRule, applyChanges: true);
        Assert.NotEmpty(rows);
        Assert.True(await db.PriceRecords.AnyAsync());
        Assert.True(await db.OutboxMessages.AnyAsync(m => m.EventType == "CatalogChanged"));

        var sig = AdminOperationsService.ComputeWebhookHmacSignature("secret-key", "1700000000", "{\"tags\":[\"catalog\"]}");
        Assert.Equal(64, sig.Length);
    }

    [Fact]
    public void Section10_PricingEngine_DistinguishesMarkupFromGrossMargin_And_IncludesUnclaimedCodCost()
    {
        var engine = new PricingEngine();
        var rule = new PricingRule
        {
            Name = "Test Pravilo",
            Scope = PricingRuleScope.Global,
            MarkupMultiplier = 1.35m,
            FixedHandlingFeeRsd = 0m,
            MinGrossMarginPercent = 15m,
            MinProfitFloorRsd = 200m,
            ExpectedUnclaimedRate = 0.08m,
            EstimatedTwoWayShippingCostRsd = 750m,
            RoundToWholeTenRsd = false
        };

        var res = engine.CalculatePrice(2000m, [rule]);

        Assert.Equal(60.00m, res.ExpectedUnclaimedCostRsd);
        Assert.Equal(2760.00m, res.SellingPriceRsd);
        Assert.True(res.MarkupPercent > res.GrossMarginPercent);
        Assert.False(res.IsBelowProfitabilityFloor);
    }

    [Fact]
    public void AT08_And_AT21_AdminRbacAndTotpMfa_OperatorBlockedFromPricingAndSuppliers_OwnerAdminAllowedWithTotp()
    {
        var security = new AdminSecurityService();

        // Operator can access Orders & Inventory, but is blocked from Pricing, Suppliers, and Audit (AT-21)
        Assert.True(security.EvaluatePageAccess(AdminRole.Operator, "/Orders").Allowed);
        Assert.True(security.EvaluatePageAccess(AdminRole.Operator, "/Inventory").Allowed);
        Assert.False(security.EvaluatePageAccess(AdminRole.Operator, "/Pricing").Allowed);
        Assert.False(security.EvaluatePageAccess(AdminRole.Operator, "/Suppliers").Allowed);
        Assert.False(security.EvaluatePageAccess(AdminRole.Operator, "/Audit").Allowed);

        // Critical mutations require OwnerAdmin + MFA verification (AT-08)
        Assert.False(security.EvaluateCriticalAction(AdminRole.Operator, true, "ApplyPricingRules").Allowed);
        Assert.False(security.EvaluateCriticalAction(AdminRole.OwnerAdmin, false, "ApplyPricingRules").Allowed);
        Assert.True(security.EvaluateCriticalAction(AdminRole.OwnerAdmin, true, "ApplyPricingRules").Allowed);

        // TOTP RFC 6238 generation and verification
        var now = DateTimeOffset.UtcNow;
        var code = security.GenerateTotpCode("SECRET-123", now);
        Assert.Equal(6, code.Length);
        Assert.True(security.VerifyTotpCode("SECRET-123", code, now));
        Assert.False(security.VerifyTotpCode("SECRET-123", "000000", now));
    }

    [Fact]
    public void NbsIpsQr_And_CourierManifestExport_GeneratesValidNbsQrAndPostExpressCsv()
    {
        var courierService = new CourierAndPaymentService();
        var qr = courierService.GenerateNbsIpsQrPayload("ORD-20261113-0001", 8990.00m);

        Assert.StartsWith("K:PR|V:01|C:1|R:", qr);
        Assert.Contains("|I:RSD8990,00|", qr);
        Assert.Contains("|SF:289|", qr);

        var order = new Order
        {
            OrderNumber = "ORD-20261113-0001",
            CustomerFullName = "Marko Petrović",
            CustomerPhoneE164 = "+381641234567",
            ShippingStreet = "Bulevar Oslobođenja 15",
            ShippingPostalCode = "21000",
            ShippingCity = "Novi Sad",
            PaymentMethod = PaymentMethod.CashOnDelivery,
            PaymentStatus = PaymentStatus.Pending,
            TotalRsd = 8990.00m,
            Items = [new OrderItem { Quantity = 2 }]
        };

        var csv = courierService.ExportCourierManifestCsv(CourierProvider.PostExpress, [order]);
        Assert.Contains("ReferencaPorudzbine;Primalac;Telefon", csv);
        Assert.Contains("ORD-20261113-0001;Marko Petrović;+381641234567", csv);

        var remSummary = courierService.ParseRemittanceCsv(
            "PostExpress",
            "PE001RS;ORD-20261113-0001;8990.00;8990.00;IZVOD-10\nPE002RS;ORD-20261113-0002;5400.00;5100.00;IZVOD-10");

        Assert.Equal(2, remSummary.TotalRows);
        Assert.Equal(1, remSummary.DiscrepancyCount);
    }

    [Fact]
    public void CouponEvaluation_EnforcesMinimumProfitFloorProtection_NeverAllowsNegativeMargin()
    {
        var promo = new PromotionAndReturnService();
        var coupon = new Coupon
        {
            Code = "MEGA50",
            DiscountPercent = 50m,
            MinSubtotalRsd = 2000m,
            ProtectMinimumMarginFloor = true,
            MaxUses = 100,
            IsActive = true
        };

        // Subtotal = 5000 RSD, Cost = 3800 RSD, MinProfitFloor = 350 RSD -> Max allowed discount is 850 RSD (not 2500 RSD!)
        var eval = promo.EvaluateCoupon(coupon, subtotalRsd: 5000m, totalOrderCostRsd: 3800m, minOrderProfitFloorRsd: 350m, DateTimeOffset.UtcNow);
        Assert.True(eval.IsValid);
        Assert.True(eval.WasCappedByMarginFloor);
        Assert.Equal(850.00m, eval.DiscountRsd);
    }

    [Fact]
    public async Task StatutoryReturnRequest_Enforces8DayResponseAnd15DayResolutionDeadlines_AndRestocksOwnInventory()
    {
        await using var db = CreateInMemoryDb();
        await CatalogSeeder.SeedAsync(db);

        var promoAndReturn = new PromotionAndReturnService();
        var submittedAt = new DateTimeOffset(2026, 11, 13, 12, 0, 0, TimeSpan.Zero);

        var rma = promoAndReturn.CreateStatutoryReturnRequest(
            orderNumber: "ORD-20261113-0001",
            orderId: null,
            customerFullName: "Jelena Jovanović",
            customerEmail: "jelena@test.rs",
            customerPhone: "0631112223",
            productSkuOrName: "INT-AKU-18V-01",
            quantity: 1,
            type: ReturnRequestType.WarrantyClaim24Months,
            reasonDescription: "Prekidač gubi kontakt",
            bankAccountForRefund: "160000000123456789",
            estimatedRefundRsd: 8990m,
            submittedAtUtc: submittedAt);

        Assert.Equal(submittedAt.AddDays(8), rma.StatutoryResponseDeadlineAt);
        Assert.Equal(submittedAt.AddDays(15), rma.StatutoryResolutionDeadlineAt);

        db.ReturnRequests.Add(rma);
        await db.SaveChangesAsync();

        var adminOps = new AdminOperationsService(db, new SupplierFeedService(), new PricingEngine());
        await adminOps.ProcessReturnDecisionAsync(
            rma.Id,
            ReturnRequestStatus.Refunded,
            "Uvažena reklamacija i vraćen artikal na stanje.",
            restockToOwnInventory: true);

        var updated = await db.ReturnRequests.FirstAsync(r => r.Id == rma.Id);
        Assert.NotNull(updated.RespondedAt);
        Assert.NotNull(updated.ResolvedAt);
        Assert.True(updated.RestockedToOwnInventory);
        Assert.True(await db.StockMovements.AnyAsync(m => m.ReferenceId == rma.RmaNumber && m.QuantityDelta == 1));
    }

    [Fact]
    public async Task SupplierPurchaseOrder_GeneratesPoForConfirmedCustomerOrder()
    {
        await using var db = CreateInMemoryDb();
        await CatalogSeeder.SeedAsync(db);

        var checkout = new CheckoutOrderService(db, new HybridInventoryService(), new AntiFraudRiskEvaluator());
        var variant = await db.ProductVariants.FirstAsync(v => v.InternalSku == "INT-AKU-18V-01");

        var confirm = await checkout.ConfirmOrderAsync(new CheckoutConfirmRequest(
            "PO-TEST-KEY-1", "Milan Nikolić", "0641234567", "milan@test.rs", "Glavna 10", "Zemun", "11080", null,
            [new CheckoutItemRequest(variant.Id, 1)],
            CouponCode: "DOBRODOSLI10",
            PreferredPaymentMethod: "BankTransfer"));

        Assert.True(confirm.Succeeded);
        Assert.True(confirm.Order!.DiscountRsd > 0m);
        Assert.NotNull(confirm.Order.IpsQrPayload);

        var adminOps = new AdminOperationsService(db, new SupplierFeedService(), new PricingEngine());
        var po = await adminOps.GenerateSupplierPurchaseOrderAsync(confirm.Order.Id);

        Assert.StartsWith("PO-", po.PoNumber);
        Assert.Equal(confirm.Order.OrderNumber, po.CustomerOrderNumber);
        Assert.True(po.TotalEstimatedCostRsd > 0m);
        Assert.True(await db.NotificationLogs.AnyAsync(n => n.ReferenceId == confirm.Order.OrderNumber && n.TemplateName == "OrderPlaced"));
    }

    [Fact]
    public void TransactionalEmailRenderer_GeneratesOrderPlacedAndShippedEmails_WithStatutory14DayNoticeAndIpsQr()
    {
        var renderer = new TransactionalEmailRenderer();
        var order = new Order
        {
            OrderNumber = "ORD-20261116-0099",
            CustomerFullName = "Nikola Tesla",
            CustomerEmail = "nikola@primer.rs",
            CustomerPhoneE164 = "+381641112223",
            ShippingStreet = "Krunska 51",
            ShippingPostalCode = "11000",
            ShippingCity = "Beograd",
            SubtotalRsd = 8990m,
            DiscountRsd = 899m,
            CouponCode = "DOBRODOSLI10",
            ShippingCostRsd = 490m,
            TotalRsd = 8581m,
            IpsQrPayload = "K:PR|V:01|C:1|R:160000000123456789|N:ALATI|I:RSD8581,00|SF:289",
            Items = [new OrderItem { ProductNameSnapshot = "Aku bušilica 18V", SkuSnapshot = "INT-AKU-18V-01", Quantity = 1, LineTotalRsd = 8990m }]
        };

        var placed = renderer.RenderOrderPlacedEmail(order);
        Assert.Contains("ORD-20261116-0099", placed.Subject);
        Assert.Contains("14 kalendarskih dana", placed.BodyHtml);
        Assert.Contains("K:PR|V:01", placed.BodyHtml);

        var shipped = renderer.RenderOrderShippedEmail(order, new Shipment
        {
            Carrier = "PostExpress",
            TrackingNumber = "PE998877RS",
            CodAmountRsd = 8581m
        });
        Assert.Contains("PE998877RS", shipped.Subject);
        Assert.Contains("PostExpress", shipped.BodyHtml);
    }

    [Fact]
    public void ProfitabilityAnalyticsService_ComputesNetMargin_Cogs_UnclaimedRateAdvisory_AndSkuRanking()
    {
        var analytics = new ProfitabilityAnalyticsService();
        var orders = new List<Order>
        {
            new()
            {
                OrderNumber = "ORD-1",
                Status = OrderStatus.Completed,
                PaymentStatus = PaymentStatus.Paid,
                SubtotalRsd = 10000m,
                DiscountRsd = 500m,
                TotalRsd = 9500m,
                Items =
                [
                    new OrderItem
                    {
                        SkuSnapshot = "INT-AKU-18V-01",
                        ProductNameSnapshot = "Aku bušilica 18V",
                        Quantity = 1,
                        UnitPriceRsd = 10000m,
                        UnitCostSnapshotRsd = 6500m,
                        LineTotalRsd = 10000m,
                        FulfillmentSource = "OwnStock"
                    }
                ]
            }
        };

        var shipments = new List<Shipment>
        {
            new() { Status = "Delivered", ReturnShippingCostRsd = 0m }
        };

        var snap = analytics.ComputeSnapshot(orders, shipments, new PricingRule { ExpectedUnclaimedRate = 0.06m });
        Assert.Equal(9500m, snap.RealizedPaidRevenueRsd);
        Assert.Equal(6500m, snap.TotalCogsRsd);
        Assert.Equal(3000m, snap.EstimatedNetProfitRsd);
        Assert.Single(snap.TopSkusByProfit);
    }

    [Fact]
    public void SupplierFeedMapper_MapsCustomHeadersAndXmlTags_Adds20PercentPdvWhenNetPrice_AndMapsCategories()
    {
        var mapper = new SupplierFeedMapperService(new SupplierFeedService());
        var targetCatId = Guid.NewGuid();
        var supplier = new Supplier
        {
            Name = "Veleprodaja B2B",
            Code = "VP-B2B",
            FeedFormat = "CSV",
            CsvDelimiter = ";",
            DecimalSeparator = ".",
            FeedPricesIncludeVat = false,
            VatRatePercent = 20.00m,
            ColumnMappingJson = """{"Sku":"KatBr","Name":"ArtikalNaziv","Price":"VPCenaBezPDV","Qty":"LagerStanje","Ean":"Barkod","Brand":"Proizvodjac","Category":"Grupa"}"""
        };

        var catMappings = new List<SupplierCategoryMapping>
        {
            new()
            {
                SupplierId = supplier.Id,
                SupplierCategoryRawName = "ELEKTRIČNI ALATI -> Bušilice",
                TargetCategoryId = targetCatId,
                TargetCategoryName = "Aku i električni alati"
            }
        };

        var csv = "KatBr;ArtikalNaziv;VPCenaBezPDV;LagerStanje;Barkod;Proizvodjac;Grupa\n" +
                  "VP-100;Udarna bušilica 18V;5000.00;IMA;8606000001011;Bosch;ELEKTRIČNI ALATI -> Bušilice";

        var mapped = mapper.ParseCustomSupplierFeed(supplier, csv, catMappings);
        Assert.Single(mapped);
        // 5000.00 net + 20% PDV = 6000.00 gross purchase cost!
        Assert.Equal("6000.00", mapped[0].FeedRowInput.RawPurchasePrice);
        Assert.Equal(5, mapped[0].FeedRowInput.Quantity);
        Assert.Equal(targetCatId, mapped[0].MappedTargetCategoryId);
    }
}

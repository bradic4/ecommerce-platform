using Ecommerce.Domain.Common;
using Ecommerce.Domain.Enums;

namespace Ecommerce.Domain.Entities;

public abstract class EntityBase
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public class Category : EntityBase
{
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? SeoTitle { get; set; }
    public string? SeoDescription { get; set; }
    public string? IntroText { get; set; }
    public Guid? ParentCategoryId { get; set; }
    public Category? ParentCategory { get; set; }
    public List<Product> Products { get; set; } = [];
}

public class Brand : EntityBase
{
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
}

public class Product : EntityBase
{
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ShortSpecification { get; set; }
    public string? GtinEan { get; set; }
    public ProductStatus Status { get; set; } = ProductStatus.Draft;
    public Guid CategoryId { get; set; }
    public Category? Category { get; set; }
    public Guid? BrandId { get; set; }
    public Brand? Brand { get; set; }
    public string? MainImageUrl { get; set; }
    public string? ImageAlt { get; set; }
    public string? SeoTitle { get; set; }
    public string? SeoDescription { get; set; }
    public bool IsSeoManuallyEdited { get; set; }

    /// <summary>
    /// Normalized Serbian search column (Cyrillic->Latin, unaccented, dj/đ unified) - Section 25.4.
    /// </summary>
    public string SearchText { get; set; } = string.Empty;

    public List<ProductVariant> Variants { get; set; } = [];

    public void RebuildSearchText(string? brandName = null)
    {
        var skuTokens = string.Join(' ', Variants.Select(v => $"{v.InternalSku} {v.GtinEan} {v.AttributeSummary}"));
        SearchText = SerbianTextNormalizer.NormalizeSearchText(
            Name,
            brandName ?? Brand?.Name,
            GtinEan,
            ShortSpecification,
            skuTokens);
    }
}

public class ProductVariant : EntityBase
{
    public Guid ProductId { get; set; }
    public Product? Product { get; set; }
    public string InternalSku { get; set; } = string.Empty;
    public string Title { get; set; } = "Standard";
    public string? GtinEan { get; set; }
    public string AttributeSummary { get; set; } = string.Empty;
    public decimal WeightKg { get; set; } = 0.5m;
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// Authoritative calculated public selling price in RSD (decimal, never float).
    /// </summary>
    public decimal CurrentSellingPriceRsd { get; set; }
    public decimal CurrentCostPriceRsd { get; set; }
    public string? AppliedPricingRuleSummary { get; set; }
    public decimal? ManualPriceOverrideRsd { get; set; }

    public List<SupplierOffer> SupplierOffers { get; set; } = [];
    public List<StockMovement> StockMovements { get; set; } = [];
    public List<StockReservation> StockReservations { get; set; } = [];
}

public class Supplier : EntityBase
{
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string? ContactEmail { get; set; }
    public string? ContactPhone { get; set; }
    public int LeadTimeDays { get; set; } = 2;
    public int Priority { get; set; } = 10;
    public bool IsActive { get; set; } = true;
    public int FeedFreshnessThresholdHours { get; set; } = 24;

    // Section 25.2 Dropship & COD fields
    public bool SupportsBlindShipping { get; set; }
    public CodCollectionMode CodCollectionMode { get; set; } = CodCollectionMode.OurCarrierAccount;
    public FulfillmentModel DefaultFulfillmentModel { get; set; } = FulfillmentModel.ModelB_CrossDock;

    public List<SupplierOffer> Offers { get; set; } = [];
}

/// <summary>
/// Canonical separation between our public ProductVariant and a supplier's raw offer (Section 8.1, AT-04).
/// UNIQUE(SupplierId, SupplierSku) prevents two suppliers with identical SKU from overwriting each other.
/// </summary>
public class SupplierOffer : EntityBase
{
    public Guid SupplierId { get; set; }
    public Supplier? Supplier { get; set; }
    public Guid? VariantId { get; set; }
    public ProductVariant? Variant { get; set; }

    public string SupplierSku { get; set; } = string.Empty;
    public string SupplierProductName { get; set; } = string.Empty;
    public string? SupplierEan { get; set; }
    public string? SupplierBrand { get; set; }
    public decimal PurchasePrice { get; set; }
    public string Currency { get; set; } = "RSD";
    public int SupplierReportedQty { get; set; }
    public bool IsActiveInFeed { get; set; } = true;
    public int MissingFeedCycles { get; set; }
    public bool NeedsManualReview { get; set; }
    public string? ReviewReason { get; set; }
    public DateTimeOffset LastFetchedAt { get; set; } = DateTimeOffset.UtcNow;
}

public class PricingRule : EntityBase
{
    public string Name { get; set; } = string.Empty;
    public PricingRuleScope Scope { get; set; } = PricingRuleScope.Global;
    public Guid? TargetEntityId { get; set; }
    public decimal MarkupMultiplier { get; set; } = 1.35m;
    public decimal FixedHandlingFeeRsd { get; set; }
    public decimal MinGrossMarginPercent { get; set; } = 15.0m;
    public decimal MinProfitFloorRsd { get; set; } = 300.0m;
    public decimal ExpectedUnclaimedRate { get; set; } = 0.06m;
    public decimal EstimatedTwoWayShippingCostRsd { get; set; } = 750.0m;
    public bool RoundToWholeTenRsd { get; set; } = true;
    public bool IsActive { get; set; } = true;
}

public class PriceRecord : EntityBase
{
    public Guid VariantId { get; set; }
    public Guid? SupplierOfferId { get; set; }
    public decimal CostSnapshotRsd { get; set; }
    public decimal OldSellingPriceRsd { get; set; }
    public decimal NewSellingPriceRsd { get; set; }
    public decimal MarkupPercent { get; set; }
    public decimal GrossMarginPercent { get; set; }
    public decimal NetContributionFloorRsd { get; set; }
    public string RuleDescription { get; set; } = string.Empty;
    public string ChangedBy { get; set; } = "system";
}

public class InventoryLocation : EntityBase
{
    public string Name { get; set; } = string.Empty;
    public InventoryLocationType Type { get; set; } = InventoryLocationType.Own;
}

/// <summary>
/// Append-only stock ledger for own physical stock (Section 07, 11.1).
/// </summary>
public class StockMovement : EntityBase
{
    public Guid VariantId { get; set; }
    public Guid LocationId { get; set; }
    public int QuantityDelta { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string? ReferenceId { get; set; }
    public string Actor { get; set; } = "system";
}

public class StockReservation : EntityBase
{
    public Guid VariantId { get; set; }
    public Guid OrderId { get; set; }
    public int Quantity { get; set; }
    public StockReservationStatus Status { get; set; } = StockReservationStatus.Active;
    public DateTimeOffset ExpiresAt { get; set; } = DateTimeOffset.UtcNow.AddHours(24);
}

public class Order : EntityBase
{
    public string OrderNumber { get; set; } = string.Empty;
    public string PublicLookupTokenHash { get; set; } = string.Empty;
    public string IdempotencyKey { get; set; } = string.Empty;

    public OrderStatus Status { get; set; } = OrderStatus.New;
    public PaymentStatus PaymentStatus { get; set; } = PaymentStatus.Pending;
    public FulfillmentStatus FulfillmentStatus { get; set; } = FulfillmentStatus.NotStarted;
    public PaymentMethod PaymentMethod { get; set; } = PaymentMethod.CashOnDelivery;

    public string CustomerFullName { get; set; } = string.Empty;
    public string CustomerPhoneE164 { get; set; } = string.Empty;
    public string CustomerEmail { get; set; } = string.Empty;
    public string ShippingStreet { get; set; } = string.Empty;
    public string ShippingCity { get; set; } = string.Empty;
    public string ShippingPostalCode { get; set; } = string.Empty;
    public string? CustomerNote { get; set; }
    public string? InternalOperatorNote { get; set; }
    public string? VerificationReason { get; set; }

    public decimal SubtotalRsd { get; set; }
    public decimal DiscountRsd { get; set; }
    public string? CouponCode { get; set; }
    public decimal ShippingCostRsd { get; set; }
    public decimal TotalRsd { get; set; }
    public string Currency { get; set; } = "RSD";

    public string? FiscalDocumentRef { get; set; }
    public string FiscalStatus { get; set; } = "Pending";
    public string? IpsQrPayload { get; set; }

    public List<OrderItem> Items { get; set; } = [];
    public List<Shipment> Shipments { get; set; } = [];
}

public class OrderItem : EntityBase
{
    public Guid OrderId { get; set; }
    public Order? Order { get; set; }
    public Guid VariantId { get; set; }
    public string ProductNameSnapshot { get; set; } = string.Empty;
    public string SkuSnapshot { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPriceRsd { get; set; }
    public decimal UnitCostSnapshotRsd { get; set; }
    public decimal LineTotalRsd { get; set; }
    public string FulfillmentSource { get; set; } = "OwnStock";
    public Guid? SelectedSupplierOfferId { get; set; }
}

public class Shipment : EntityBase
{
    public Guid OrderId { get; set; }
    public string Carrier { get; set; } = "PostExpress";
    public string? TrackingNumber { get; set; }
    public string ShippedBy { get; set; } = "Own";
    public string CarrierAccountOwner { get; set; } = "Own";
    public decimal ShippingCostRsd { get; set; }
    public decimal CodAmountRsd { get; set; }
    public decimal ReturnShippingCostRsd { get; set; }
    public string Status { get; set; } = "Preparing";
    public DateTimeOffset? ShippedAt { get; set; }
    public DateTimeOffset? DeliveredAt { get; set; }
    public DateTimeOffset? UnclaimedAt { get; set; }
}

public class CodRemittance : EntityBase
{
    public string Carrier { get; set; } = string.Empty;
    public DateTimeOffset PeriodFrom { get; set; }
    public DateTimeOffset PeriodTo { get; set; }
    public decimal ExpectedAmountRsd { get; set; }
    public decimal ReceivedAmountRsd { get; set; }
    public DateTimeOffset? ReceivedAt { get; set; }
    public string? BankReference { get; set; }
    public CodRemittanceStatus Status { get; set; } = CodRemittanceStatus.Open;
}

public class CustomerRiskRecord : EntityBase
{
    public string PhoneHash { get; set; } = string.Empty;
    public string? EmailHash { get; set; }
    public string? AddressHash { get; set; }
    public int UnclaimedCount { get; set; }
    public DateTimeOffset? LastIncidentAt { get; set; }
    public string? Note { get; set; }
}

public class ImportRun : EntityBase
{
    public Guid SupplierId { get; set; }
    public string FeedFormat { get; set; } = "CSV";
    public bool IsDryRun { get; set; } = true;
    public bool IsDeltaFeed { get; set; }
    public ImportRunStatus Status { get; set; } = ImportRunStatus.Running;
    public int TotalRows { get; set; }
    public int AddedCount { get; set; }
    public int UpdatedCount { get; set; }
    public int MissingInFeedCount { get; set; }
    public int QuarantinedCount { get; set; }
    public string? SafetyBlockReason { get; set; }
    public string SummaryReportJson { get; set; } = "{}";
}

public class RedirectRule : EntityBase
{
    public string OldPath { get; set; } = string.Empty;
    public string NewPath { get; set; } = string.Empty;
    public int StatusCode { get; set; } = 301;
}

public class AuditLog : EntityBase
{
    public string Actor { get; set; } = "system";
    public string Action { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public string? BeforeSummary { get; set; }
    public string? AfterSummary { get; set; }
    public string? Reason { get; set; }
}

public class OutboxMessage : EntityBase
{
    public string EventType { get; set; } = string.Empty;
    public string PayloadJson { get; set; } = "{}";
    public int Attempts { get; set; }
    public DateTimeOffset? ProcessedAt { get; set; }
    public string? LastError { get; set; }
}

public class Article : EntityBase
{
    public string Title { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string Excerpt { get; set; } = string.Empty;
    public string BodyMarkdown { get; set; } = string.Empty;
    public string CategorySlug { get; set; } = string.Empty;
    public string CategoryName { get; set; } = string.Empty;
    public string RelatedQuery { get; set; } = string.Empty;
    public string SeoTitle { get; set; } = string.Empty;
    public string SeoDescription { get; set; } = string.Empty;
    public int ReadingTimeMinutes { get; set; } = 5;
    public ArticleStatus Status { get; set; } = ArticleStatus.Draft;
    public DateTimeOffset? PublishedAt { get; set; }
}

/// <summary>
/// Statutory 14-day withdrawal or 24-month warranty claim (Zakon o zaštiti potrošača RS - Section 04.1, 15, 22).
/// Enforces 8-day customer response deadline and 15-day resolution deadline.
/// </summary>
public class ReturnRequest : EntityBase
{
    public string RmaNumber { get; set; } = string.Empty;
    public Guid? OrderId { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public string CustomerFullName { get; set; } = string.Empty;
    public string CustomerEmail { get; set; } = string.Empty;
    public string CustomerPhoneE164 { get; set; } = string.Empty;
    public string ProductSkuOrName { get; set; } = string.Empty;
    public int Quantity { get; set; } = 1;
    public ReturnRequestType Type { get; set; } = ReturnRequestType.Withdrawal14Days;
    public ReturnRequestStatus Status { get; set; } = ReturnRequestStatus.Submitted;
    public string ReasonDescription { get; set; } = string.Empty;
    public string? CustomerBankAccountForRefund { get; set; }
    public string? OfficialDecisionNote { get; set; }
    public decimal RefundAmountRsd { get; set; }
    public bool RestockedToOwnInventory { get; set; }
    public DateTimeOffset StatutoryResponseDeadlineAt { get; set; }
    public DateTimeOffset StatutoryResolutionDeadlineAt { get; set; }
    public DateTimeOffset? RespondedAt { get; set; }
    public DateTimeOffset? ResolvedAt { get; set; }
}

public class Coupon : EntityBase
{
    public string Code { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal DiscountPercent { get; set; }
    public decimal FixedDiscountRsd { get; set; }
    public decimal MinSubtotalRsd { get; set; }
    public bool ProtectMinimumMarginFloor { get; set; } = true;
    public int MaxUses { get; set; } = 1000;
    public int CurrentUses { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTimeOffset? ExpiresAt { get; set; }
}

public class SupplierPurchaseOrder : EntityBase
{
    public string PoNumber { get; set; } = string.Empty;
    public Guid SupplierId { get; set; }
    public string SupplierName { get; set; } = string.Empty;
    public Guid CustomerOrderId { get; set; }
    public string CustomerOrderNumber { get; set; } = string.Empty;
    public FulfillmentModel FulfillmentModel { get; set; } = FulfillmentModel.ModelB_CrossDock;
    public SupplierPoStatus Status { get; set; } = SupplierPoStatus.Draft;
    public decimal TotalEstimatedCostRsd { get; set; }
    public string LinesSummaryJson { get; set; } = "[]";
    public string? SupplierReference { get; set; }
}

public class NotificationLog : EntityBase
{
    public string Channel { get; set; } = "Email";
    public string TemplateName { get; set; } = string.Empty;
    public string Recipient { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string BodyHtml { get; set; } = string.Empty;
    public string ReferenceId { get; set; } = string.Empty;
    public string Status { get; set; } = "Sent";
}

public class ProductReview : EntityBase
{
    public Guid ProductId { get; set; }
    public string ProductSlug { get; set; } = string.Empty;
    public string AuthorName { get; set; } = string.Empty;
    public string? VerifiedOrderNumber { get; set; }
    public bool IsVerifiedPurchase { get; set; }
    public int Rating { get; set; } = 5;
    public string Title { get; set; } = string.Empty;
    public string Comment { get; set; } = string.Empty;
    public string? AdminTechnicalReply { get; set; }
    public bool IsApproved { get; set; } = true;
}

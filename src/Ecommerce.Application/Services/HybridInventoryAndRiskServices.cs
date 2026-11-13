using Ecommerce.Domain.Common;
using Ecommerce.Domain.Entities;
using Ecommerce.Domain.Enums;

namespace Ecommerce.Application.Services;

public record VariantAvailabilityProjection(
    Guid VariantId,
    int OwnPhysicalStock,
    int ActiveReservedStock,
    int OwnSellableQty,
    int BestSupplierSellableQty,
    Guid? BestSupplierOfferId,
    string? BestSupplierName,
    int EstimatedLeadTimeDays,
    string FulfillmentSource,
    string PublicStatusLabel,
    bool IsOrderable);

public class HybridInventoryService
{
    /// <summary>
    /// Computes hybrid reselling availability (Section 11.1 &amp; 11.2):
    /// 1) Prioritizes own physical stock (OwnStock - ActiveReservations).
    /// 2) Falls back to fresh, approved supplier offers after safety buffer.
    /// </summary>
    public VariantAvailabilityProjection ProjectAvailability(
        ProductVariant variant,
        IEnumerable<StockMovement> movements,
        IEnumerable<StockReservation> reservations,
        IEnumerable<SupplierOffer> supplierOffers,
        IEnumerable<Supplier> suppliers,
        DateTimeOffset nowUtc,
        int supplierSafetyBufferQty = 1)
    {
        var ownPhysical = movements
            .Where(m => m.VariantId == variant.Id)
            .Sum(m => m.QuantityDelta);

        var reserved = reservations
            .Where(r => r.VariantId == variant.Id
                        && r.Status == StockReservationStatus.Active
                        && r.ExpiresAt > nowUtc)
            .Sum(r => r.Quantity);

        var ownSellable = Math.Max(0, ownPhysical - reserved);

        var supplierMap = suppliers.Where(s => s.IsActive).ToDictionary(s => s.Id);
        var freshOffers = supplierOffers
            .Where(o => o.VariantId == variant.Id
                        && o.IsActiveInFeed
                        && !o.NeedsManualReview
                        && supplierMap.TryGetValue(o.SupplierId, out var sup)
                        && (nowUtc - o.LastFetchedAt).TotalHours <= sup.FeedFreshnessThresholdHours
                        && (o.SupplierReportedQty - supplierSafetyBufferQty) > 0)
            .Select(o => new
            {
                Offer = o,
                Supplier = supplierMap[o.SupplierId],
                EffectiveQty = Math.Max(0, o.SupplierReportedQty - supplierSafetyBufferQty)
            })
            // Rank by purchase price, supplier priority, and lead time (Section 11.2 step 3)
            .OrderBy(x => x.Offer.PurchasePrice)
            .ThenBy(x => x.Supplier.Priority)
            .ThenBy(x => x.Supplier.LeadTimeDays)
            .ToList();

        var bestSupplier = freshOffers.FirstOrDefault();

        if (ownSellable > 0)
        {
            return new VariantAvailabilityProjection(
                VariantId: variant.Id,
                OwnPhysicalStock: ownPhysical,
                ActiveReservedStock: reserved,
                OwnSellableQty: ownSellable,
                BestSupplierSellableQty: bestSupplier?.EffectiveQty ?? 0,
                BestSupplierOfferId: bestSupplier?.Offer.Id,
                BestSupplierName: bestSupplier?.Supplier.Name,
                EstimatedLeadTimeDays: 1,
                FulfillmentSource: "OwnStock",
                PublicStatusLabel: "Na stanju (isporuka 1-2 radna dana)",
                IsOrderable: true);
        }

        if (bestSupplier is not null)
        {
            return new VariantAvailabilityProjection(
                VariantId: variant.Id,
                OwnPhysicalStock: ownPhysical,
                ActiveReservedStock: reserved,
                OwnSellableQty: 0,
                BestSupplierSellableQty: bestSupplier.EffectiveQty,
                BestSupplierOfferId: bestSupplier.Offer.Id,
                BestSupplierName: bestSupplier.Supplier.Name,
                EstimatedLeadTimeDays: bestSupplier.Supplier.LeadTimeDays + 1,
                FulfillmentSource: $"Supplier:{bestSupplier.Supplier.Code}",
                PublicStatusLabel: $"Dostupno kod dobavljača (isporuka {bestSupplier.Supplier.LeadTimeDays + 1}-{bestSupplier.Supplier.LeadTimeDays + 3} dana)",
                IsOrderable: true);
        }

        return new VariantAvailabilityProjection(
            VariantId: variant.Id,
            OwnPhysicalStock: ownPhysical,
            ActiveReservedStock: reserved,
            OwnSellableQty: 0,
            BestSupplierSellableQty: 0,
            BestSupplierOfferId: null,
            BestSupplierName: null,
            EstimatedLeadTimeDays: 0,
            FulfillmentSource: "None",
            PublicStatusLabel: "Trenutno nedostupno",
            IsOrderable: false);
    }
}

public record RiskEvaluationResult(
    bool RequiresManualVerification,
    OrderStatus RecommendedInitialStatus,
    string? VerificationReason,
    string NormalizedPhoneE164,
    string PhoneHash);

public class AntiFraudRiskEvaluator
{
    /// <summary>
    /// Evaluates incoming COD/guest checkout orders against unclaimed parcel history,
    /// high-value threshold, postal code validity, and velocity rules (Section 25.3, AT-17).
    /// </summary>
    public RiskEvaluationResult EvaluateOrder(
        string rawPhone,
        string email,
        string postalCode,
        decimal orderTotalRsd,
        IEnumerable<CustomerRiskRecord> riskRecords,
        int recentOrdersFromSamePhoneLast24h,
        decimal highValueThresholdRsd = 15000m,
        int maxOrdersPer24h = 3)
    {
        var normalizedPhone = SerbianTextNormalizer.NormalizePhoneE164(rawPhone);
        var phoneHash = SerbianTextNormalizer.ComputeSha256Hash(normalizedPhone);
        var emailHash = string.IsNullOrWhiteSpace(email) ? null : SerbianTextNormalizer.ComputeSha256Hash(email);

        var reasons = new List<string>();

        // Check Serbian 5-digit postal code (11000 - 38999)
        var cleanPostal = postalCode?.Trim() ?? string.Empty;
        if (cleanPostal.Length != 5 || !int.TryParse(cleanPostal, out var postalNum) || postalNum is < 11000 or > 38999)
        {
            reasons.Add($"Neispravan poštanski broj ('{postalCode}').");
        }

        // Check unclaimed parcel history (AT-17)
        var matchingRisk = riskRecords.FirstOrDefault(r =>
            r.PhoneHash == phoneHash || (emailHash != null && r.EmailHash == emailHash));

        if (matchingRisk is { UnclaimedCount: > 0 })
        {
            reasons.Add($"Kupac ima evidentirane nepreuzete pošiljke ({matchingRisk.UnclaimedCount}x) - obavezna telefonska potvrda ili avans.");
        }

        // Velocity check
        if (recentOrdersFromSamePhoneLast24h >= maxOrdersPer24h)
        {
            reasons.Add($"Više od {maxOrdersPer24h} porudžbine sa istog telefona u poslednja 24h.");
            return new RiskEvaluationResult(
                RequiresManualVerification: true,
                RecommendedInitialStatus: OrderStatus.OnHold,
                VerificationReason: string.Join(" | ", reasons),
                NormalizedPhoneE164: normalizedPhone,
                PhoneHash: phoneHash);
        }

        // High-value first order check
        if (orderTotalRsd >= highValueThresholdRsd)
        {
            reasons.Add($"Porudžbina iznad praga od {highValueThresholdRsd:N0} RSD ({orderTotalRsd:N0} RSD) zahteva kratku telefonsku potvrdu.");
        }

        if (reasons.Count > 0)
        {
            return new RiskEvaluationResult(
                RequiresManualVerification: true,
                RecommendedInitialStatus: OrderStatus.AwaitingVerification,
                VerificationReason: string.Join(" | ", reasons),
                NormalizedPhoneE164: normalizedPhone,
                PhoneHash: phoneHash);
        }

        return new RiskEvaluationResult(
            RequiresManualVerification: false,
            RecommendedInitialStatus: OrderStatus.New,
            VerificationReason: null,
            NormalizedPhoneE164: normalizedPhone,
            PhoneHash: phoneHash);
    }
}

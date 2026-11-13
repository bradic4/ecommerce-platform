using System.Globalization;
using Ecommerce.Domain.Common;
using Ecommerce.Domain.Entities;
using Ecommerce.Domain.Enums;

namespace Ecommerce.Application.Services;

public record SupplierFeedRowInput(
    string SupplierSku,
    string ProductName,
    string? Ean,
    string? Brand,
    string RawPurchasePrice,
    int Quantity,
    string Currency = "RSD");

public record FeedImportOptions(
    char DecimalSeparator = '.',
    bool IsDeltaFeed = false,
    bool IsDryRun = true,
    decimal MaxMassDisappearanceRatio = 0.20m,
    decimal MaxPriceSwingRatio = 0.30m);

public record FeedRowFailure(string SupplierSku, string Reason);

public record FeedImportPreview(
    Guid SupplierId,
    bool IsDryRun,
    bool IsDeltaFeed,
    ImportRunStatus Status,
    int TotalRows,
    int AddedCount,
    int UpdatedCount,
    int MatchedVariantCount,
    int NeedsManualReviewCount,
    int MissingFromFeedCount,
    string? SafetyBlockReason,
    IReadOnlyList<FeedRowFailure>QuarantinedRows);

public class SupplierFeedService
{
    /// <summary>
    /// Explicitly parses feed decimal according to the feed's configured decimal separator (Section 8.2, AT-03).
    /// "1232.0000" with '.' separator -> 1232.00m (never 12,320,000).
    /// </summary>
    public decimal ParseFeedPrice(string rawPrice, char decimalSeparator = '.')
    {
        if (string.IsNullOrWhiteSpace(rawPrice))
            throw new FormatException("Nabavna cena u feedu je prazna.");

        var cleaned = rawPrice.Trim();
        var thousandSeparator = decimalSeparator == '.' ? ',' : '.';

        // If thousand separator appears after decimal separator, format is invalid
        var decIdx = cleaned.LastIndexOf(decimalSeparator);
        var thouIdx = cleaned.LastIndexOf(thousandSeparator);
        if (decIdx >= 0 && thouIdx > decIdx)
            throw new FormatException($"Neispravan format cene '{rawPrice}' za decimalni separator '{decimalSeparator}'.");

        var normalized = cleaned.Replace(thousandSeparator.ToString(), string.Empty);
        if (decimalSeparator != '.')
            normalized = normalized.Replace(decimalSeparator, '.');

        if (!decimal.TryParse(normalized, NumberStyles.AllowDecimalPoint, CultureInfo.InvariantCulture, out var value) || value <= 0m)
            throw new FormatException($"Cena '{rawPrice}' nije validan pozitivan broj.");

        return decimal.Round(value, 2, MidpointRounding.AwayFromZero);
    }

    /// <summary>
    /// Processes a supplier feed against existing offers and canonical variants (Sections 08 &amp; 09, AT-03..AT-07).
    /// </summary>
    public FeedImportPreview ProcessFeed(
        Guid supplierId,
        IReadOnlyList<SupplierFeedRowInput> incomingRows,
        IList<SupplierOffer> existingSupplierOffers,
        IReadOnlyList<ProductVariant> canonicalVariants,
        FeedImportOptions options)
    {
        var quarantined = new List<FeedRowFailure>();
        var seenSkusInFeed = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var duplicateSkusInFeed = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var row in incomingRows)
        {
            if (string.IsNullOrWhiteSpace(row.SupplierSku))
                continue;
            var normSku = SerbianTextNormalizer.NormalizeSku(row.SupplierSku);
            if (!seenSkusInFeed.Add(normSku))
                duplicateSkusInFeed.Add(normSku);
        }

        var existingForThisSupplier = existingSupplierOffers
            .Where(o => o.SupplierId == supplierId)
            .ToDictionary(o => SerbianTextNormalizer.NormalizeSku(o.SupplierSku), StringComparer.OrdinalIgnoreCase);

        int added = 0, updated = 0, matched = 0, needsReview = 0;
        var stagedActions = new List<Action>();

        foreach (var row in incomingRows)
        {
            if (string.IsNullOrWhiteSpace(row.SupplierSku))
            {
                quarantined.Add(new FeedRowFailure("(prazan SKU)", "Nedostaje SKU dobavljača."));
                continue;
            }

            var normSku = SerbianTextNormalizer.NormalizeSku(row.SupplierSku);
            if (duplicateSkusInFeed.Contains(normSku))
            {
                quarantined.Add(new FeedRowFailure(normSku, "Dupli SKU u istom feedu (Sekcija 9.2)."));
                continue;
            }

            if (row.Quantity < 0)
            {
                quarantined.Add(new FeedRowFailure(normSku, $"Negativna količina ({row.Quantity}) nije dozvoljena."));
                continue;
            }

            decimal parsedPrice;
            try
            {
                parsedPrice = ParseFeedPrice(row.RawPurchasePrice, options.DecimalSeparator);
            }
            catch (FormatException ex)
            {
                // AT-07: Bad purchase price -> keep old price, put row in errors
                quarantined.Add(new FeedRowFailure(normSku, ex.Message));
                continue;
            }

            string? normalizedEan = null;
            if (!string.IsNullOrWhiteSpace(row.Ean))
            {
                try
                {
                    normalizedEan = SerbianTextNormalizer.NormalizeEan(row.Ean);
                }
                catch (FormatException ex)
                {
                    quarantined.Add(new FeedRowFailure(normSku, ex.Message));
                    continue;
                }
            }

            // Step 2: Check existing (SupplierId + SupplierSku) pair (AT-04)
            if (existingForThisSupplier.TryGetValue(normSku, out var existingOffer))
            {
                var priceDeltaRatio = existingOffer.PurchasePrice > 0m
                    ? Math.Abs(parsedPrice - existingOffer.PurchasePrice) / existingOffer.PurchasePrice
                    : 0m;

                var flaggedForPriceSwing = priceDeltaRatio > options.MaxPriceSwingRatio;
                if (flaggedForPriceSwing)
                    needsReview++;

                updated++;
                if (existingOffer.VariantId.HasValue)
                    matched++;

                stagedActions.Add(() =>
                {
                    if (flaggedForPriceSwing)
                    {
                        existingOffer.NeedsManualReview = true;
                        existingOffer.ReviewReason =
                            $"Nagla promena nabavne cene ({existingOffer.PurchasePrice:N2} -> {parsedPrice:N2} RSD, {priceDeltaRatio:P1}).";
                    }
                    else
                    {
                        existingOffer.PurchasePrice = parsedPrice;
                        existingOffer.NeedsManualReview = false;
                        existingOffer.ReviewReason = null;
                    }

                    existingOffer.SupplierReportedQty = row.Quantity;
                    existingOffer.IsActiveInFeed = true;
                    existingOffer.MissingFeedCycles = 0;
                    existingOffer.LastFetchedAt = DateTimeOffset.UtcNow;
                });
            }
            else
            {
                // Step 3: Match by clean EAN/GTIN only if unambiguous (Section 8.1)
                Guid? matchedVariantId = null;
                bool ambiguousMatch = false;
                if (!string.IsNullOrEmpty(normalizedEan))
                {
                    var eanCandidates = canonicalVariants
                        .Where(v => string.Equals(v.GtinEan, normalizedEan, StringComparison.OrdinalIgnoreCase))
                        .ToList();

                    if (eanCandidates.Count == 1)
                    {
                        matchedVariantId = eanCandidates[0].Id;
                        matched++;
                    }
                    else if (eanCandidates.Count > 1)
                    {
                        ambiguousMatch = true;
                    }
                }

                var requiresReview = !matchedVariantId.HasValue || ambiguousMatch;
                if (requiresReview)
                    needsReview++;

                added++;
                stagedActions.Add(() =>
                {
                    existingSupplierOffers.Add(new SupplierOffer
                    {
                        SupplierId = supplierId,
                        VariantId = matchedVariantId,
                        SupplierSku = normSku,
                        SupplierProductName = row.ProductName.Trim(),
                        SupplierEan = normalizedEan,
                        SupplierBrand = row.Brand?.Trim(),
                        PurchasePrice = parsedPrice,
                        Currency = row.Currency,
                        SupplierReportedQty = row.Quantity,
                        IsActiveInFeed = true,
                        NeedsManualReview = requiresReview,
                        ReviewReason = ambiguousMatch
                            ? "Više kanonskih varijanti deli isti EAN - obavezan ručni pregled."
                            : (!matchedVariantId.HasValue ? "Novi dobavljački artikal čeka odobrenje i mapiranje." : null),
                        LastFetchedAt = DateTimeOffset.UtcNow
                    });
                });
            }
        }

        // Check missing offers in full feed vs delta feed (AT-05 & AT-06)
        var activePriorOffers = existingForThisSupplier.Values.Where(o => o.IsActiveInFeed).ToList();
        var missingOffers = activePriorOffers
            .Where(o => !seenSkusInFeed.Contains(SerbianTextNormalizer.NormalizeSku(o.SupplierSku)))
            .ToList();

        if (!options.IsDeltaFeed && activePriorOffers.Count > 0)
        {
            var missingRatio = (decimal)missingOffers.Count / activePriorOffers.Count;
            if (missingRatio > options.MaxMassDisappearanceRatio)
            {
                // AT-05: >20% disappeared -> block automatic mass deactivation!
                return new FeedImportPreview(
                    SupplierId: supplierId,
                    IsDryRun: options.IsDryRun,
                    IsDeltaFeed: options.IsDeltaFeed,
                    Status: ImportRunStatus.QuarantinedForReview,
                    TotalRows: incomingRows.Count,
                    AddedCount: added,
                    UpdatedCount: updated,
                    MatchedVariantCount: matched,
                    NeedsManualReviewCount: needsReview,
                    MissingFromFeedCount: missingOffers.Count,
                    SafetyBlockReason:
                        $"Bezbednosna blokada (AT-05): {missingOffers.Count} od {activePriorOffers.Count} ({missingRatio:P1}) aktivnih ponuda je nestalo iz feeda (prag {options.MaxMassDisappearanceRatio:P0}).",
                    QuarantinedRows: quarantined);
            }

            foreach (var missing in missingOffers)
            {
                stagedActions.Add(() =>
                {
                    missing.MissingFeedCycles++;
                    // Grace period: only mark inactive in feed after 2 consecutive full-feed absences (Section 9.2)
                    if (missing.MissingFeedCycles >= 2)
                    {
                        missing.IsActiveInFeed = false;
                        missing.SupplierReportedQty = 0;
                    }
                });
            }
        }

        if (!options.IsDryRun)
        {
            foreach (var action in stagedActions)
                action();
        }

        return new FeedImportPreview(
            SupplierId: supplierId,
            IsDryRun: options.IsDryRun,
            IsDeltaFeed: options.IsDeltaFeed,
            Status: options.IsDryRun ? ImportRunStatus.DryRunCompleted : ImportRunStatus.Applied,
            TotalRows: incomingRows.Count,
            AddedCount: added,
            UpdatedCount: updated,
            MatchedVariantCount: matched,
            NeedsManualReviewCount: needsReview,
            MissingFromFeedCount: options.IsDeltaFeed ? 0 : missingOffers.Count,
            SafetyBlockReason: null,
            QuarantinedRows: quarantined);
    }
}

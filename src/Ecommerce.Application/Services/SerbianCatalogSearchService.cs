using Ecommerce.Domain.Common;
using Ecommerce.Domain.Entities;
using Ecommerce.Domain.Enums;

namespace Ecommerce.Application.Services;

public record ProductSearchHit(Product Product, double Score);

public class SerbianCatalogSearchService
{
    /// <summary>
    /// Searches published catalog products across Cyrillic, Latin, unaccented input, and typos (Section 25.4, AT-19).
    /// Ranking: Exact SKU/EAN -> Title prefix -> All token match -> Trigram similarity.
    /// </summary>
    public IReadOnlyList<ProductSearchHit> Search(IEnumerable<Product> products, string rawQuery, int maxResults = 20)
    {
        if (string.IsNullOrWhiteSpace(rawQuery))
            return [];

        var normQuery = SerbianTextNormalizer.NormalizeSearchText(rawQuery);
        if (string.IsNullOrEmpty(normQuery))
            return [];

        var queryTokens = normQuery.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        var hits = new List<ProductSearchHit>();

        foreach (var product in products.Where(p => p.Status == ProductStatus.Published))
        {
            if (string.IsNullOrEmpty(product.SearchText))
                product.RebuildSearchText();

            var normTitle = SerbianTextNormalizer.NormalizeSearchText(product.Name);

            // 1. Exact SKU or EAN match
            if (product.Variants.Any(v =>
                    string.Equals(v.InternalSku, rawQuery.Trim(), StringComparison.OrdinalIgnoreCase)
                    || string.Equals(v.GtinEan, rawQuery.Trim(), StringComparison.OrdinalIgnoreCase))
                || string.Equals(product.GtinEan, rawQuery.Trim(), StringComparison.OrdinalIgnoreCase))
            {
                hits.Add(new ProductSearchHit(product, 1.0));
                continue;
            }

            // 2. Prefix match on normalized title
            if (normTitle.StartsWith(normQuery, StringComparison.Ordinal))
            {
                hits.Add(new ProductSearchHit(product, 0.95));
                continue;
            }

            // 3. Substring / token match on SearchText
            var searchWords = product.SearchText.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            var exactTokenHits = queryTokens.Count(qt => searchWords.Any(sw => sw.Contains(qt, StringComparison.Ordinal)));
            if (exactTokenHits == queryTokens.Length)
            {
                hits.Add(new ProductSearchHit(product, 0.85));
                continue;
            }

            // 4. Trigram similarity for typos (e.g. "busilca" -> "busilica", AT-19)
            double bestTokenSim = 0;
            foreach (var qt in queryTokens)
            {
                var maxForToken = searchWords
                    .Select(sw => ComputeTrigramSimilarity(qt, sw))
                    .DefaultIfEmpty(0.0)
                    .Max();
                bestTokenSim += maxForToken;
            }

            var avgSim = bestTokenSim / queryTokens.Length;
            if (avgSim >= 0.35)
            {
                hits.Add(new ProductSearchHit(product, Math.Round(avgSim * 0.8, 4)));
            }
        }

        return hits
            .OrderByDescending(h => h.Score)
            .ThenBy(h => h.Product.Name)
            .Take(maxResults)
            .ToList();
    }

    public static double ComputeTrigramSimilarity(string a, string b)
    {
        if (string.IsNullOrEmpty(a) || string.IsNullOrEmpty(b))
            return 0.0;
        if (a == b)
            return 1.0;

        var triA = ExtractTrigrams(a);
        var triB = ExtractTrigrams(b);
        if (triA.Count == 0 || triB.Count == 0)
            return 0.0;

        var intersection = triA.Intersect(triB).Count();
        var union = triA.Union(triB).Count();
        return union == 0 ? 0.0 : (double)intersection / union;
    }

    private static HashSet<string> ExtractTrigrams(string s)
    {
        var padded = $"  {s} ";
        var set = new HashSet<string>(StringComparer.Ordinal);
        for (int i = 0; i <= padded.Length - 3; i++)
        {
            set.Add(padded.Substring(i, 3));
        }
        return set;
    }
}

using System.Globalization;
using System.Text.Json;
using System.Xml.Linq;
using Ecommerce.Domain.Common;
using Ecommerce.Domain.Entities;

namespace Ecommerce.Application.Services;

public record SupplierColumnProfile(
    string Sku = "sifra",
    string Name = "naziv",
    string Price = "cena",
    string Qty = "stanje",
    string Ean = "ean",
    string Brand = "brend",
    string Category = "kategorija");

public record MappedSupplierFeedRow(
    SupplierFeedRowInput FeedRowInput,
    string? RawSupplierCategory,
    Guid? MappedTargetCategoryId,
    string? MappedTargetCategoryName);

public class SupplierFeedMapperService(SupplierFeedService feedService)
{
    public SupplierColumnProfile ParseProfile(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
            return new SupplierColumnProfile();

        try
        {
            var opts = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            return JsonSerializer.Deserialize<SupplierColumnProfile>(json, opts) ?? new SupplierColumnProfile();
        }
        catch
        {
            return new SupplierColumnProfile();
        }
    }

    /// <summary>
    /// Parses a CSV or XML supplier feed using the supplier's custom ColumnMappingJson, delimiter, decimal separator,
    /// VAT rules (Net vs Gross PDV 20%), and Category Mappings (Section 8.2).
    /// </summary>
    public IReadOnlyList<MappedSupplierFeedRow> ParseCustomSupplierFeed(
        Supplier supplier,
        string rawContent,
        IReadOnlyList<SupplierCategoryMapping> categoryMappings)
    {
        if (string.IsNullOrWhiteSpace(rawContent))
            return [];

        var profile = ParseProfile(supplier.ColumnMappingJson);
        var trimmed = rawContent.Trim();

        var isXml = string.Equals(supplier.FeedFormat, "XML", StringComparison.OrdinalIgnoreCase)
                    || trimmed.StartsWith('<');

        return isXml
            ? ParseMappedXml(supplier, trimmed, profile, categoryMappings)
            : ParseMappedCsv(supplier, trimmed, profile, categoryMappings);
    }

    private IReadOnlyList<MappedSupplierFeedRow> ParseMappedCsv(
        Supplier supplier,
        string csvContent,
        SupplierColumnProfile profile,
        IReadOnlyList<SupplierCategoryMapping> categoryMappings)
    {
        var results = new List<MappedSupplierFeedRow>();
        var lines = csvContent
            .Split(['\r', '\n'], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        if (lines.Length == 0) return results;

        var delimiter = string.IsNullOrEmpty(supplier.CsvDelimiter) ? ';' : supplier.CsvDelimiter[0];
        var decSep = string.IsNullOrEmpty(supplier.DecimalSeparator) ? '.' : supplier.DecimalSeparator[0];

        var firstParts = lines[0].Split(delimiter).Select(h => h.Trim().Trim('"')).ToArray();
        var hasHeader = firstParts.Any(h =>
            MatchesHeader(h, profile.Sku, "sifra", "katbr", "sku", "code") ||
            MatchesHeader(h, profile.Price, "cena", "vpcena", "price", "netocena"));

        int idxSku = 0, idxName = 1, idxPrice = 2, idxQty = 3, idxEan = 4, idxBrand = 5, idxCat = 6;

        if (hasHeader)
        {
            idxSku = FindHeaderIndex(firstParts, profile.Sku, 0, "sifra", "katbr", "sku", "code");
            idxName = FindHeaderIndex(firstParts, profile.Name, 1, "naziv", "ime", "name", "artikal");
            idxPrice = FindHeaderIndex(firstParts, profile.Price, 2, "cena", "vpcena", "price", "netocena");
            idxQty = FindHeaderIndex(firstParts, profile.Qty, 3, "stanje", "kolicina", "lager", "qty", "raspolozivo");
            idxEan = FindHeaderIndex(firstParts, profile.Ean, 4, "ean", "barkod", "gtin", "barcode");
            idxBrand = FindHeaderIndex(firstParts, profile.Brand, 5, "brend", "proizvodjac", "brand");
            idxCat = FindHeaderIndex(firstParts, profile.Category, 6, "kategorija", "grupa", "category");
        }

        var startRow = hasHeader ? 1 : 0;
        for (int i = startRow; i < lines.Length; i++)
        {
            var line = lines[i];
            if (string.IsNullOrWhiteSpace(line) || line.StartsWith('#')) continue;

            var cols = line.Split(delimiter).Select(c => c.Trim().Trim('"')).ToArray();
            var sku = GetCol(cols, idxSku);
            var name = GetCol(cols, idxName);
            var rawPriceStr = GetCol(cols, idxPrice);
            var rawQtyStr = GetCol(cols, idxQty);
            var ean = GetCol(cols, idxEan);
            var brand = GetCol(cols, idxBrand);
            var rawCat = GetCol(cols, idxCat);

            if (string.IsNullOrWhiteSpace(sku)) continue;

            var adjustedRawPrice = ApplyVatIfNetPrice(supplier, rawPriceStr, decSep);
            var qty = ParseFlexibleQty(rawQtyStr);
            var (catId, catName) = ResolveCategoryMapping(supplier.Id, rawCat, categoryMappings);

            results.Add(new MappedSupplierFeedRow(
                new SupplierFeedRowInput(
                    SupplierSku: sku,
                    ProductName: string.IsNullOrWhiteSpace(name) ? sku : name,
                    Ean: string.IsNullOrWhiteSpace(ean) ? null : ean,
                    Brand: string.IsNullOrWhiteSpace(brand) ? null : brand,
                    RawPurchasePrice: adjustedRawPrice,
                    Quantity: qty),
                RawSupplierCategory: string.IsNullOrWhiteSpace(rawCat) ? null : rawCat,
                MappedTargetCategoryId: catId,
                MappedTargetCategoryName: catName));
        }

        return results;
    }

    private IReadOnlyList<MappedSupplierFeedRow> ParseMappedXml(
        Supplier supplier,
        string xmlContent,
        SupplierColumnProfile profile,
        IReadOnlyList<SupplierCategoryMapping> categoryMappings)
    {
        var results = new List<MappedSupplierFeedRow>();
        var doc = XDocument.Parse(xmlContent);
        var decSep = string.IsNullOrEmpty(supplier.DecimalSeparator) ? '.' : supplier.DecimalSeparator[0];

        var itemNodes = doc.Descendants()
            .Where(e => e.Name.LocalName.Equals("item", StringComparison.OrdinalIgnoreCase) ||
                        e.Name.LocalName.Equals("product", StringComparison.OrdinalIgnoreCase) ||
                        e.Name.LocalName.Equals("artikal", StringComparison.OrdinalIgnoreCase) ||
                        e.Name.LocalName.Equals("row", StringComparison.OrdinalIgnoreCase))
            .ToList();

        foreach (var node in itemNodes)
        {
            var sku = GetXmlVal(node, profile.Sku, "sifra", "katbr", "sku", "code");
            if (string.IsNullOrWhiteSpace(sku)) continue;

            var name = GetXmlVal(node, profile.Name, "naziv", "ime", "name", "title") ?? sku;
            var rawPriceStr = GetXmlVal(node, profile.Price, "cena", "vpcena", "price", "netocena") ?? "0";
            var rawQtyStr = GetXmlVal(node, profile.Qty, "stanje", "kolicina", "lager", "qty") ?? "0";
            var ean = GetXmlVal(node, profile.Ean, "ean", "barkod", "gtin");
            var brand = GetXmlVal(node, profile.Brand, "brend", "proizvodjac", "brand");
            var rawCat = GetXmlVal(node, profile.Category, "kategorija", "grupa", "category");

            var adjustedRawPrice = ApplyVatIfNetPrice(supplier, rawPriceStr, decSep);
            var qty = ParseFlexibleQty(rawQtyStr);
            var (catId, catName) = ResolveCategoryMapping(supplier.Id, rawCat, categoryMappings);

            results.Add(new MappedSupplierFeedRow(
                new SupplierFeedRowInput(
                    SupplierSku: sku,
                    ProductName: name,
                    Ean: ean,
                    Brand: brand,
                    RawPurchasePrice: adjustedRawPrice,
                    Quantity: qty),
                RawSupplierCategory: rawCat,
                MappedTargetCategoryId: catId,
                MappedTargetCategoryName: catName));
        }

        return results;
    }

    private string ApplyVatIfNetPrice(Supplier supplier, string rawPrice, char decSep)
    {
        if (supplier.FeedPricesIncludeVat || supplier.VatRatePercent <= 0m)
            return rawPrice;

        try
        {
            var netVal = feedService.ParseFeedPrice(rawPrice, decSep);
            var grossVal = Math.Round(netVal * (1m + (supplier.VatRatePercent / 100m)), 2, MidpointRounding.AwayFromZero);
            return decSep == ','
                ? grossVal.ToString("0.00", CultureInfo.InvariantCulture).Replace('.', ',')
                : grossVal.ToString("0.00", CultureInfo.InvariantCulture);
        }
        catch
        {
            return rawPrice;
        }
    }

    private static int ParseFlexibleQty(string? rawQty)
    {
        if (string.IsNullOrWhiteSpace(rawQty)) return 0;
        var clean = rawQty.Trim().Replace(">", "").Replace("+", "");
        if (clean.Equals("DA", StringComparison.OrdinalIgnoreCase) ||
            clean.Equals("IMA", StringComparison.OrdinalIgnoreCase) ||
            clean.Equals("IN_STOCK", StringComparison.OrdinalIgnoreCase))
        {
            return 5;
        }
        return int.TryParse(clean, out var q) ? Math.Max(0, q) : 0;
    }

    private static (Guid?, string?) ResolveCategoryMapping(
        Guid supplierId,
        string? rawCategory,
        IReadOnlyList<SupplierCategoryMapping> mappings)
    {
        if (string.IsNullOrWhiteSpace(rawCategory)) return (null, null);
        var normRaw = SerbianTextNormalizer.NormalizeForSearch(rawCategory);

        var match = mappings.FirstOrDefault(m =>
            m.SupplierId == supplierId &&
            SerbianTextNormalizer.NormalizeForSearch(m.SupplierCategoryRawName) == normRaw);

        return match is not null ? (match.TargetCategoryId, match.TargetCategoryName) : (null, null);
    }

    private static int FindHeaderIndex(string[] headers, string configuredName, int fallbackIdx, params string[] aliases)
    {
        for (int i = 0; i < headers.Length; i++)
        {
            if (MatchesHeader(headers[i], configuredName, aliases))
                return i;
        }
        return fallbackIdx;
    }

    private static bool MatchesHeader(string actual, string configured, params string[] aliases)
    {
        var normActual = SerbianTextNormalizer.NormalizeForSearch(actual);
        if (!string.IsNullOrWhiteSpace(configured) &&
            normActual == SerbianTextNormalizer.NormalizeForSearch(configured))
        {
            return true;
        }

        foreach (var a in aliases)
        {
            if (normActual == SerbianTextNormalizer.NormalizeForSearch(a))
                return true;
        }
        return false;
    }

    private static string GetCol(string[] cols, int idx) =>
        idx >= 0 && idx < cols.Length ? cols[idx] : string.Empty;

    private static string? GetXmlVal(XElement parent, string configuredTag, params string[] aliases)
    {
        foreach (var el in parent.Elements())
        {
            if (MatchesHeader(el.Name.LocalName, configuredTag, aliases))
                return el.Value.Trim();
        }
        foreach (var attr in parent.Attributes())
        {
            if (MatchesHeader(attr.Name.LocalName, configuredTag, aliases))
                return attr.Value.Trim();
        }
        return null;
    }
}

using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;

namespace Ecommerce.Domain.Common;

public static partial class SerbianTextNormalizer
{
    private static readonly Dictionary<char, string> CyrillicToLatinMap = new()
    {
        ['а'] = "a", ['б'] = "b", ['в'] = "v", ['г'] = "g", ['д'] = "d",
        ['ђ'] = "dj", ['е'] = "e", ['ж'] = "z", ['з'] = "z", ['и'] = "i",
        ['ј'] = "j", ['к'] = "k", ['л'] = "l", ['љ'] = "lj", ['м'] = "m",
        ['н'] = "n", ['њ'] = "nj", ['о'] = "o", ['п'] = "p", ['р'] = "r",
        ['с'] = "s", ['т'] = "t", ['ћ'] = "c", ['у'] = "u", ['ф'] = "f",
        ['х'] = "h", ['ц'] = "c", ['ч'] = "c", ['џ'] = "dz", ['ш'] = "s"
    };

    /// <summary>
    /// Normalizes Serbian text (Cyrillic or Latin with diacritics) into ASCII search tokens.
    /// Treats "bušilica", "busilica", "бушилица", and "đon"/"djon" identically (Section 25.4).
    /// </summary>
    public static string NormalizeForSearch(string? input) => NormalizeSearchText(input);

    public static string BuildCompositeSearchText(params string?[] parts) => NormalizeSearchText(parts);

    public static string NormalizeSearchText(params string?[] parts)
    {
        var sb = new StringBuilder();
        foreach (var part in parts)
        {
            if (string.IsNullOrWhiteSpace(part))
                continue;

            if (sb.Length > 0)
                sb.Append(' ');

            var lower = part.Trim().ToLowerInvariant();
            foreach (var ch in lower)
            {
                if (CyrillicToLatinMap.TryGetValue(ch, out var mapped))
                {
                    sb.Append(mapped);
                }
                else
                {
                    sb.Append(ch switch
                    {
                        'đ' => "dj",
                        'č' or 'ć' => "c",
                        'š' => "s",
                        'ž' => "z",
                        _ => ch.ToString()
                    });
                }
            }
        }

        var decomposed = sb.ToString().Normalize(NormalizationForm.FormD);
        var ascii = new StringBuilder(decomposed.Length);
        foreach (var c in decomposed)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
                ascii.Append(c);
        }

        return MultiWhitespaceRegex().Replace(ascii.ToString().Normalize(NormalizationForm.FormC), " ").Trim();
    }

    public static string Slugify(string input)
    {
        var normalized = NormalizeSearchText(input);
        var slug = NonSlugCharRegex().Replace(normalized, "-").Trim('-');
        return MultiDashRegex().Replace(slug, "-");
    }

    /// <summary>
    /// Preserves leading zeros and rejects scientific notation from Excel (Section 8.2, AT-03).
    /// </summary>
    public static string? NormalizeEan(string? rawEan)
    {
        if (string.IsNullOrWhiteSpace(rawEan))
            return null;

        var trimmed = rawEan.Trim();
        if (trimmed.Contains('E', StringComparison.OrdinalIgnoreCase) || trimmed.Contains('+'))
            throw new FormatException($"Neispravan EAN format (eksponencijalni zapis nije dozvoljen): '{rawEan}'.");

        var digitsOnly = new string(trimmed.Where(char.IsDigit).ToArray());
        if (digitsOnly.Length is < 8 or > 14)
            throw new FormatException($"EAN/GTIN mora imati 8 do 14 cifara (dobijeno: '{rawEan}').");

        return digitsOnly;
    }

    public static string NormalizeSku(string rawSku)
    {
        if (string.IsNullOrWhiteSpace(rawSku))
            throw new ArgumentException("SKU ne sme biti prazan.", nameof(rawSku));

        return MultiWhitespaceRegex().Replace(rawSku.Trim().ToUpperInvariant(), "-");
    }

    /// <summary>
    /// Normalizes Serbian phone numbers to E.164 (+381...) for anti-fraud matching (Section 25.3).
    /// </summary>
    public static string NormalizePhoneE164(string rawPhone)
    {
        if (string.IsNullOrWhiteSpace(rawPhone))
            throw new ArgumentException("Broj telefona je obavezan.", nameof(rawPhone));

        var digits = new string(rawPhone.Where(c => char.IsDigit(c) || c == '+').ToArray());
        if (digits.StartsWith("00381", StringComparison.Ordinal))
            digits = "+381" + digits[5..];
        else if (digits.StartsWith("381", StringComparison.Ordinal))
            digits = "+" + digits;
        else if (digits.StartsWith('0'))
            digits = "+381" + digits[1..];

        var numericTail = new string(digits.SkipWhile(c => c == '+').Where(char.IsDigit).ToArray());
        if (numericTail.Length is < 9 or > 13)
            throw new FormatException($"Broj telefona nije ispravan: '{rawPhone}'.");

        return "+" + numericTail;
    }

    public static string ComputeSha256Hash(string normalizedValue)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(normalizedValue.Trim().ToLowerInvariant()));
        return Convert.ToHexStringLower(bytes);
    }

    [GeneratedRegex(@"\s+")]
    private static partial Regex MultiWhitespaceRegex();

    [GeneratedRegex(@"[^a-z0-9]+")]
    private static partial Regex NonSlugCharRegex();

    [GeneratedRegex(@"-{2,}")]
    private static partial Regex MultiDashRegex();
}

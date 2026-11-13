using System.Globalization;
using System.Text;
using Ecommerce.Domain.Entities;
using Ecommerce.Domain.Enums;

namespace Ecommerce.Application.Services;

public record CourierRemittanceCsvRow(
    string TrackingNumber,
    string OrderNumber,
    decimal ExpectedCodRsd,
    decimal PaidOutRsd,
    string BankReference,
    bool HasDiscrepancy);

public record CourierRemittanceParseSummary(
    string Carrier,
    int TotalRows,
    decimal TotalExpectedRsd,
    decimal TotalReceivedRsd,
    int DiscrepancyCount,
    IReadOnlyList<CourierRemittanceCsvRow> Rows);

public class CourierAndPaymentService
{
    /// <summary>
    /// Generates an official National Bank of Serbia (NBS) IPS QR payload string (Section 13.1 &amp; 23).
    /// Format: K:PR|V:01|C:1|R:160000000123456789|N:ALATI I DOMACINSTVO PR|I:RSD4490,00|SF:289|S:Porudzbina ORD-...|RO:00...
    /// </summary>
    public string GenerateNbsIpsQrPayload(
        string orderNumber,
        decimal amountRsd,
        string merchantBankAccount = "160000000123456789",
        string merchantName = "ALATI I DOMACINSTVO PR BEOGRAD")
    {
        if (amountRsd <= 0)
            throw new ArgumentOutOfRangeException(nameof(amountRsd), "Iznos za NBS IPS QR mora biti veći od 0 RSD.");

        var cleanAccount = new string(merchantBankAccount.Where(char.IsDigit).ToArray());
        if (cleanAccount.Length != 18)
        {
            cleanAccount = cleanAccount.PadRight(18, '0')[..18];
        }

        // NBS IPS requires comma as decimal separator with 2 decimals: e.g. RSD4490,00
        var formattedAmount = amountRsd.ToString("0.00", CultureInfo.InvariantCulture).Replace('.', ',');
        var digitsOnlyOrderRef = new string(orderNumber.Where(char.IsDigit).ToArray());
        if (string.IsNullOrEmpty(digitsOnlyOrderRef))
        {
            digitsOnlyOrderRef = "2026001";
        }

        var safeMerchant = merchantName.Replace("|", " ").Trim();
        if (safeMerchant.Length > 70) safeMerchant = safeMerchant[..70];

        return $"K:PR|V:01|C:1|R:{cleanAccount}|N:{safeMerchant}|I:RSD{formattedAmount}|SF:289|S:Uplata po porudzbini {orderNumber}|RO:00{digitsOnlyOrderRef}";
    }

    /// <summary>
    /// Exports confirmed/ready orders into a CSV manifest tailored for Serbian courier services (PostExpress, BEX, D Express, AKS - Section 12.3).
    /// </summary>
    public string ExportCourierManifestCsv(
        CourierProvider provider,
        IEnumerable<Order> orders)
    {
        var sb = new StringBuilder();

        var header = provider switch
        {
            CourierProvider.PostExpress => "ReferencaPorudzbine;Primalac;Telefon;UlicaIBroj;PostanskiBroj;Mesto;OtkupninaRSD;VrednostPosiljkeRSD;MasaKg;NapomenaZaKurira",
            CourierProvider.Bex => "SifraPorudzbine;ImeIPrezime;KontaktTelefon;Adresa;PakBroj;Grad;Otkupnina;BrojPaketa;TezinaKg;Napomena",
            _ => "OrderNumber;RecipientName;RecipientPhone;Street;PostalCode;City;CodAmountRsd;WeightKg;Note"
        };
        sb.AppendLine(header);

        foreach (var o in orders)
        {
            var codAmount = o.PaymentMethod == PaymentMethod.CashOnDelivery && o.PaymentStatus != PaymentStatus.Paid
                ? o.TotalRsd
                : 0m;

            var note = string.IsNullOrWhiteSpace(o.CustomerNote)
                ? $"Porudzbina {o.OrderNumber}"
                : o.CustomerNote.Replace(";", ",").Replace("\r", " ").Replace("\n", " ");

            var totalItems = o.Items.Sum(i => i.Quantity);
            var estimatedWeightKg = Math.Max(0.5m, totalItems * 1.2m);

            sb.AppendLine(string.Join(";",
                o.OrderNumber,
                SanitizeCsvField(o.CustomerFullName),
                SanitizeCsvField(o.CustomerPhoneE164),
                SanitizeCsvField(o.ShippingStreet),
                SanitizeCsvField(o.ShippingPostalCode),
                SanitizeCsvField(o.ShippingCity),
                codAmount.ToString("0.00", CultureInfo.InvariantCulture),
                o.TotalRsd.ToString("0.00", CultureInfo.InvariantCulture),
                estimatedWeightKg.ToString("0.0", CultureInfo.InvariantCulture),
                note));
        }

        return sb.ToString();
    }

    /// <summary>
    /// Parses a courier COD remittance CSV statement and identifies discrepancies (Section 13.3 &amp; 25.2, AT-18).
    /// Expected CSV columns: TrackingNumber;OrderNumber;ExpectedCodRsd;PaidOutRsd;BankReference
    /// </summary>
    public CourierRemittanceParseSummary ParseRemittanceCsv(string carrier, string csvContent)
    {
        var rows = new List<CourierRemittanceCsvRow>();
        var lines = (csvContent ?? string.Empty)
            .Split(['\r', '\n'], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        foreach (var line in lines)
        {
            if (line.StartsWith("Tracking", StringComparison.OrdinalIgnoreCase) ||
                line.StartsWith("BrojPosiljke", StringComparison.OrdinalIgnoreCase) ||
                line.StartsWith("#"))
            {
                continue;
            }

            var parts = line.Split([';', ',']);
            if (parts.Length < 4) continue;

            var tracking = parts[0].Trim();
            var orderNo = parts[1].Trim();
            var expected = decimal.TryParse(parts[2].Trim().Replace(',', '.'), NumberStyles.Any, CultureInfo.InvariantCulture, out var expVal) ? expVal : 0m;
            var paidOut = decimal.TryParse(parts[3].Trim().Replace(',', '.'), NumberStyles.Any, CultureInfo.InvariantCulture, out var paidVal) ? paidVal : 0m;
            var bankRef = parts.Length >= 5 ? parts[4].Trim() : $"IZVOD-{DateTimeOffset.UtcNow:yyyyMMdd}";

            var hasDiscrepancy = Math.Abs(expected - paidOut) >= 0.01m;
            rows.Add(new CourierRemittanceCsvRow(tracking, orderNo, expected, paidOut, bankRef, hasDiscrepancy));
        }

        return new CourierRemittanceParseSummary(
            carrier,
            rows.Count,
            rows.Sum(r => r.ExpectedCodRsd),
            rows.Sum(r => r.PaidOutRsd),
            rows.Count(r => r.HasDiscrepancy),
            rows);
    }

    private static string SanitizeCsvField(string? input)
    {
        if (string.IsNullOrWhiteSpace(input)) return string.Empty;
        return input.Replace(";", ",").Replace("\r", " ").Replace("\n", " ").Trim();
    }
}

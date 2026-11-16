using System.Security.Cryptography;
using System.Text;
using Ecommerce.Domain.Enums;

namespace Ecommerce.Application.Services;

public record AdminAccessEvaluation(
    bool Allowed,
    string? DenialReason);

public class AdminSecurityService
{
    private static readonly HashSet<string> OwnerOnlyPaths = new(StringComparer.OrdinalIgnoreCase)
    {
        "/Suppliers",
        "/Pricing",
        "/Coupons",
        "/Analytics",
        "/Audit"
    };

    private static readonly HashSet<string> MfaRequiredActions = new(StringComparer.OrdinalIgnoreCase)
    {
        "ApplyPricingRules",
        "ApplySupplierImport",
        "DeleteData",
        "ExportAudit"
    };

    /// <summary>
    /// Evaluates whether an authenticated admin user can access a given Razor Page route (Section 02, 16.1, 25.5, AT-21).
    /// Operator role is restricted to Orders, Inventory, Content, and Dashboard.
    /// OwnerAdmin role has full access.
    /// </summary>
    public AdminAccessEvaluation EvaluatePageAccess(AdminRole role, string pagePath)
    {
        var normalized = pagePath.Trim();
        if (string.IsNullOrEmpty(normalized)) normalized = "/";

        foreach (var restricted in OwnerOnlyPaths)
        {
            if (normalized.StartsWith(restricted, StringComparison.OrdinalIgnoreCase) &&
                role != AdminRole.OwnerAdmin)
            {
                return new AdminAccessEvaluation(
                    false,
                    $"Uloga '{role}' nema pristup modulu '{restricted}'. Pristup je dozvoljen isključivo za OwnerAdmin.");
            }
        }

        return new AdminAccessEvaluation(true, null);
    }

    /// <summary>
    /// Evaluates whether an admin user can execute a critical mutation (requires OwnerAdmin + active MFA verification, Section 16.1, AT-08).
    /// </summary>
    public AdminAccessEvaluation EvaluateCriticalAction(AdminRole role, bool mfaVerified, string actionName)
    {
        if (MfaRequiredActions.Contains(actionName))
        {
            if (role != AdminRole.OwnerAdmin)
            {
                return new AdminAccessEvaluation(
                    false,
                    $"Akcija '{actionName}' zahteva OwnerAdmin privilegije.");
            }

            if (!mfaVerified)
            {
                return new AdminAccessEvaluation(
                    false,
                    $"Akcija '{actionName}' zahteva potvrđenu dvofaktorsku autentifikaciju (TOTP MFA).");
            }
        }

        return new AdminAccessEvaluation(true, null);
    }

    /// <summary>
    /// Generates a 6-digit TOTP code for a given shared secret and timestamp (30-second step, HMAC-SHA1 per RFC 6238).
    /// </summary>
    public string GenerateTotpCode(string secret, DateTimeOffset timestampUtc)
    {
        var step = timestampUtc.ToUnixTimeSeconds() / 30;
        return ComputeTotpForStep(secret, step);
    }

    /// <summary>
    /// Verifies a 6-digit TOTP code allowing +/- 1 time step window (30s drift tolerance).
    /// </summary>
    public bool VerifyTotpCode(string secret, string code, DateTimeOffset timestampUtc)
    {
        if (string.IsNullOrWhiteSpace(code) || code.Trim().Length != 6)
            return false;

        var cleanCode = code.Trim();
        var currentStep = timestampUtc.ToUnixTimeSeconds() / 30;

        for (long offset = -1; offset <= 1; offset++)
        {
            var candidate = ComputeTotpForStep(secret, currentStep + offset);
            if (CryptographicOperations.FixedTimeEquals(
                    Encoding.ASCII.GetBytes(candidate),
                    Encoding.ASCII.GetBytes(cleanCode)))
            {
                return true;
            }
        }

        return false;
    }

    private static string ComputeTotpForStep(string secret, long counter)
    {
        var keyBytes = Encoding.UTF8.GetBytes(secret);
        var counterBytes = BitConverter.GetBytes(counter);
        if (BitConverter.IsLittleEndian)
        {
            Array.Reverse(counterBytes);
        }

        using var hmac = new HMACSHA1(keyBytes);
        var hash = hmac.ComputeHash(counterBytes);
        var offset = hash[^1] & 0x0F;
        var binaryCode =
            ((hash[offset] & 0x7F) << 24) |
            ((hash[offset + 1] & 0xFF) << 16) |
            ((hash[offset + 2] & 0xFF) << 8) |
            (hash[offset + 3] & 0xFF);

        var otp = binaryCode % 1_000_000;
        return otp.ToString("D6");
    }
}

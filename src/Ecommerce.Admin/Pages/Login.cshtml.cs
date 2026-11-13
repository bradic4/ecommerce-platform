using Ecommerce.Application.Services;
using Ecommerce.Domain.Entities;
using Ecommerce.Domain.Enums;
using Ecommerce.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace Ecommerce.Admin.Pages;

public class LoginModel(AdminSecurityService securityService, EcommerceDbContext db, IConfiguration config) : PageModel
{
    public string CurrentRole { get; set; } = "OwnerAdmin";
    public bool MfaVerified { get; set; }
    public string DemoTotpCode { get; set; } = string.Empty;

    [TempData]
    public string? StatusMessage { get; set; }

    public void OnGet()
    {
        CurrentRole = Request.Cookies["AdminRole"] ?? "OwnerAdmin";
        MfaVerified = Request.Cookies["AdminMfa"] == "true";
        var secret = config["AdminMfaSecret"] ?? "JBSWY3DPEHPK3PXP-DEV-SECRET";
        DemoTotpCode = securityService.GenerateTotpCode(secret, DateTimeOffset.UtcNow);
    }

    public async Task<IActionResult> OnPostSwitchRoleAsync(string role, string? totpCode, CancellationToken ct)
    {
        var parsedRole = Enum.TryParse<AdminRole>(role, true, out var r) ? r : AdminRole.Operator;
        var secret = config["AdminMfaSecret"] ?? "JBSWY3DPEHPK3PXP-DEV-SECRET";
        var mfaOk = false;

        if (parsedRole == AdminRole.OwnerAdmin)
        {
            mfaOk = securityService.VerifyTotpCode(secret, totpCode ?? string.Empty, DateTimeOffset.UtcNow);
            if (!mfaOk)
            {
                StatusMessage = "Greška: Za ulogu OwnerAdmin neophodan je ispravan 6-cifreni TOTP MFA kod.";
                return RedirectToPage();
            }
        }

        Response.Cookies.Append("AdminRole", parsedRole.ToString(), new CookieOptions
        {
            HttpOnly = true,
            SameSite = SameSiteMode.Strict,
            Expires = DateTimeOffset.UtcNow.AddHours(8)
        });

        Response.Cookies.Append("AdminMfa", mfaOk ? "true" : "false", new CookieOptions
        {
            HttpOnly = true,
            SameSite = SameSiteMode.Strict,
            Expires = DateTimeOffset.UtcNow.AddHours(8)
        });

        db.AuditLogs.Add(new AuditLog
        {
            Actor = parsedRole.ToString(),
            Action = "AdminSessionAuthenticated",
            EntityType = "AdminSession",
            EntityId = parsedRole.ToString(),
            AfterSummary = $"Role={parsedRole}, MfaVerified={mfaOk}"
        });
        await db.SaveChangesAsync(ct);

        StatusMessage = $"Aktivna sesija: {parsedRole} (MFA verifikovan: {(mfaOk ? "DA" : "NE")}).";
        return RedirectToPage();
    }
}

using Ecommerce.Domain.Entities;
using Ecommerce.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;

namespace Ecommerce.Admin.Pages;

public class CouponsModel(EcommerceDbContext db) : PageModel
{
    public List<Coupon> Coupons { get; set; } = new();

    [TempData]
    public string? StatusMessage { get; set; }

    public async Task OnGetAsync(CancellationToken ct)
    {
        Coupons = await db.Coupons
            .AsNoTracking()
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync(ct);
    }

    public async Task<IActionResult> OnPostCreateAsync(
        string code,
        string description,
        decimal discountPercent,
        decimal fixedDiscountRsd,
        decimal minSubtotalRsd,
        bool protectMinimumMarginFloor,
        int maxUses,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(code))
        {
            StatusMessage = "Greška: Kod kupona je obavezan.";
            return RedirectToPage();
        }

        var cleanCode = code.Trim().ToUpperInvariant();
        if (await db.Coupons.AnyAsync(c => c.Code == cleanCode, ct))
        {
            StatusMessage = $"Greška: Kupon '{cleanCode}' već postoji.";
            return RedirectToPage();
        }

        var coupon = new Coupon
        {
            Code = cleanCode,
            Description = description?.Trim() ?? string.Empty,
            DiscountPercent = Math.Clamp(discountPercent, 0m, 80m),
            FixedDiscountRsd = Math.Max(0m, fixedDiscountRsd),
            MinSubtotalRsd = Math.Max(0m, minSubtotalRsd),
            ProtectMinimumMarginFloor = protectMinimumMarginFloor,
            MaxUses = Math.Max(1, maxUses),
            IsActive = true,
            ExpiresAt = DateTimeOffset.UtcNow.AddMonths(3)
        };

        db.Coupons.Add(coupon);
        db.AuditLogs.Add(new AuditLog
        {
            Actor = "vlasnik",
            Action = "CouponCreated",
            EntityType = nameof(Coupon),
            EntityId = coupon.Code,
            AfterSummary = $"Percent={coupon.DiscountPercent}%, Fixed={coupon.FixedDiscountRsd} RSD, MarginGuard={coupon.ProtectMinimumMarginFloor}"
        });

        await db.SaveChangesAsync(ct);
        StatusMessage = $"Kreiran promo kod '{coupon.Code}'.";
        return RedirectToPage();
    }

    public async Task<IActionResult> OnPostToggleAsync(Guid couponId, CancellationToken ct)
    {
        var coupon = await db.Coupons.FirstOrDefaultAsync(c => c.Id == couponId, ct);
        if (coupon is not null)
        {
            coupon.IsActive = !coupon.IsActive;
            await db.SaveChangesAsync(ct);
            StatusMessage = $"Promo kod '{coupon.Code}' je sada {(coupon.IsActive ? "AKTIVAN" : "DEAKTIVIRAN")}.";
        }
        return RedirectToPage();
    }
}

using Ecommerce.Application.Services;
using Ecommerce.Domain.Entities;
using Ecommerce.Domain.Enums;
using Ecommerce.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;

namespace Ecommerce.Admin.Pages;

public class AnalyticsModel(
    EcommerceDbContext db,
    ProfitabilityAnalyticsService analyticsService) : PageModel
{
    public StoreFinancialSnapshot Snapshot { get; set; } = default!;
    public List<ProductReview> Reviews { get; set; } = new();

    [TempData]
    public string? StatusMessage { get; set; }

    public async Task OnGetAsync(CancellationToken ct)
    {
        var orders = await db.Orders
            .AsNoTracking()
            .Include(o => o.Items)
            .ToListAsync(ct);

        var shipments = await db.Shipments
            .AsNoTracking()
            .ToListAsync(ct);

        var globalRule = await db.PricingRules
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.Scope == PricingRuleScope.Global && r.IsActive, ct);

        Snapshot = analyticsService.ComputeSnapshot(orders, shipments, globalRule);

        Reviews = await db.ProductReviews
            .AsNoTracking()
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync(ct);
    }

    public async Task<IActionResult> OnPostReplyReviewAsync(
        Guid reviewId,
        string adminReply,
        bool isApproved,
        CancellationToken ct)
    {
        var rev = await db.ProductReviews.FirstOrDefaultAsync(r => r.Id == reviewId, ct);
        if (rev is not null)
        {
            rev.AdminTechnicalReply = string.IsNullOrWhiteSpace(adminReply) ? null : adminReply.Trim();
            rev.IsApproved = isApproved;
            rev.UpdatedAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync(ct);
            StatusMessage = $"Sačuvan stručni odgovor i status za recenziju ({rev.AuthorName}).";
        }
        return RedirectToPage();
    }
}

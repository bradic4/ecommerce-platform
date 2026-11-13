using Ecommerce.Application.Services;
using Ecommerce.Domain.Entities;
using Ecommerce.Infrastructure.Persistence;
using Ecommerce.Infrastructure.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;

namespace Ecommerce.Admin.Pages;

public class InventoryModel(
    EcommerceDbContext db,
    HybridInventoryService inventoryService,
    AdminOperationsService adminOps) : PageModel
{
    public List<(ProductVariant Variant, Product Product, VariantAvailabilityProjection Availability)> Items { get; set; } = [];
    public List<StockMovement> RecentMovements { get; set; } = [];
    public List<RedirectRule> RedirectRules { get; set; } = [];

    [TempData]
    public string? StatusMessage { get; set; }

    public async Task OnGetAsync(CancellationToken ct)
    {
        var variants = await db.ProductVariants
            .AsNoTracking()
            .Include(v => v.Product)
            .OrderBy(v => v.InternalSku)
            .ToListAsync(ct);

        var movements = await db.StockMovements.AsNoTracking().ToListAsync(ct);
        var reservations = await db.StockReservations.AsNoTracking().ToListAsync(ct);
        var offers = await db.SupplierOffers.AsNoTracking().ToListAsync(ct);
        var suppliers = await db.Suppliers.AsNoTracking().ToListAsync(ct);
        var now = DateTimeOffset.UtcNow;

        foreach (var v in variants.Where(v => v.Product is not null))
        {
            var proj = inventoryService.ProjectAvailability(v, movements, reservations, offers, suppliers, now);
            Items.Add((v, v.Product!, proj));
        }

        RecentMovements = await db.StockMovements.AsNoTracking()
            .OrderByDescending(m => m.CreatedAt)
            .Take(15)
            .ToListAsync(ct);

        RedirectRules = await db.RedirectRules.AsNoTracking()
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync(ct);
    }

    public async Task<IActionResult> OnPostAdjustStockAsync(Guid variantId, int delta, string reason, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(reason))
        {
            StatusMessage = "Greška: Razlog ručne korekcije zaliha je obavezan (Sekcija 05).";
            return RedirectToPage();
        }

        await adminOps.AdjustOwnStockAsync(variantId, delta, reason, "operater", ct);
        StatusMessage = $"Sopstveni lager je korigovan za {delta:+#;-#;0} kom uz upis u StockMovement ledger i AuditLog.";
        return RedirectToPage();
    }

    public async Task<IActionResult> OnPostRenameSlugAsync(Guid productId, string newSlug, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(newSlug))
            return RedirectToPage();

        await adminOps.RenameProductSlugAsync(productId, newSlug, "vlasnik", ct);
        StatusMessage = "URL slug proizvoda je promenjen, a stari URL je automatski upisan u 301 Redirect Manager (AT-11).";
        return RedirectToPage();
    }
}

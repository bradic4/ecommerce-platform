using Ecommerce.Application.Services;
using Ecommerce.Domain.Entities;
using Ecommerce.Domain.Enums;
using Ecommerce.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;

namespace Ecommerce.Admin.Pages;

public class IndexModel(
    EcommerceDbContext db,
    HybridInventoryService inventoryService) : PageModel
{
    public int NewOrdersCount { get; set; }
    public int VerificationOrdersCount { get; set; }
    public int PublishedProductsCount { get; set; }
    public int SupplierOffersReviewCount { get; set; }
    public List<Order> RecentOrders { get; set; } = [];
    public List<(ProductVariant Variant, string ProductName, VariantAvailabilityProjection Availability)> CatalogStockOverview { get; set; } = [];

    public async Task OnGetAsync(CancellationToken ct)
    {
        NewOrdersCount = await db.Orders.CountAsync(o => o.Status == OrderStatus.New, ct);
        VerificationOrdersCount = await db.Orders.CountAsync(o => o.Status == OrderStatus.AwaitingVerification || o.Status == OrderStatus.OnHold, ct);
        PublishedProductsCount = await db.Products.CountAsync(p => p.Status == ProductStatus.Published, ct);
        SupplierOffersReviewCount = await db.SupplierOffers.CountAsync(o => o.NeedsManualReview, ct);

        RecentOrders = await db.Orders
            .AsNoTracking()
            .Include(o => o.Items)
            .OrderByDescending(o => o.CreatedAt)
            .Take(20)
            .ToListAsync(ct);

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

        foreach (var v in variants)
        {
            var proj = inventoryService.ProjectAvailability(v, movements, reservations, offers, suppliers, now);
            CatalogStockOverview.Add((v, v.Product?.Name ?? v.Title, proj));
        }
    }

    public async Task<IActionResult> OnPostConfirmOrderAsync(Guid orderId, CancellationToken ct)
    {
        var order = await db.Orders.FirstOrDefaultAsync(o => o.Id == orderId, ct);
        if (order is not null && (order.Status == OrderStatus.New || order.Status == OrderStatus.AwaitingVerification))
        {
            var prev = order.Status;
            order.Status = OrderStatus.Confirmed;
            order.FulfillmentStatus = FulfillmentStatus.ReadyToPack;
            order.UpdatedAt = DateTimeOffset.UtcNow;

            db.AuditLogs.Add(new AuditLog
            {
                Actor = "operater",
                Action = "OrderConfirmed",
                EntityType = nameof(Order),
                EntityId = order.OrderNumber,
                BeforeSummary = prev.ToString(),
                AfterSummary = order.Status.ToString()
            });

            await db.SaveChangesAsync(ct);
        }

        return RedirectToPage();
    }
}

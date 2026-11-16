using Ecommerce.Domain.Entities;
using Ecommerce.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;

namespace Ecommerce.Admin.Pages;

public class OrderPrintModel(EcommerceDbContext db) : PageModel
{
    public Order? Order { get; set; }

    public async Task<IActionResult> OnGetAsync(Guid orderId, CancellationToken ct)
    {
        Order = await db.Orders
            .AsNoTracking()
            .Include(o => o.Items)
            .Include(o => o.Shipments)
            .FirstOrDefaultAsync(o => o.Id == orderId, ct);

        if (Order is null)
        {
            return RedirectToPage("/Orders");
        }

        return Page();
    }
}

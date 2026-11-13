using Ecommerce.Application.Services;
using Ecommerce.Domain.Entities;
using Ecommerce.Domain.Enums;
using Ecommerce.Infrastructure.Persistence;
using Ecommerce.Infrastructure.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;

namespace Ecommerce.Admin.Pages;

public class ReturnsModel(
    EcommerceDbContext db,
    AdminOperationsService adminOps,
    PromotionAndReturnService returnService) : PageModel
{
    public List<ReturnRequest> ReturnRequests { get; set; } = new();

    [TempData]
    public string? StatusMessage { get; set; }

    public async Task OnGetAsync(CancellationToken ct)
    {
        ReturnRequests = await db.ReturnRequests
            .AsNoTracking()
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync(ct);
    }

    public async Task<IActionResult> OnPostCreateManualRmaAsync(
        string orderNumber,
        string customerFullName,
        string customerPhone,
        string customerEmail,
        string productSkuOrName,
        int quantity,
        ReturnRequestType type,
        string reasonDescription,
        decimal estimatedRefundRsd,
        CancellationToken ct)
    {
        var rma = returnService.CreateStatutoryReturnRequest(
            orderNumber: orderNumber,
            orderId: null,
            customerFullName: customerFullName,
            customerEmail: customerEmail ?? string.Empty,
            customerPhone: customerPhone,
            productSkuOrName: productSkuOrName,
            quantity: quantity,
            type: type,
            reasonDescription: reasonDescription,
            bankAccountForRefund: null,
            estimatedRefundRsd: estimatedRefundRsd,
            submittedAtUtc: DateTimeOffset.UtcNow);

        db.ReturnRequests.Add(rma);
        await db.SaveChangesAsync(ct);

        StatusMessage = $"Zaveden zahtev {rma.RmaNumber}. Zakonski rok za odgovor (8 dana): {rma.StatutoryResponseDeadlineAt:dd.MM.yyyy.}";
        return RedirectToPage();
    }

    public async Task<IActionResult> OnPostProcessDecisionAsync(
        Guid returnId,
        ReturnRequestStatus newStatus,
        string officialDecisionNote,
        bool restockToOwnInventory,
        CancellationToken ct)
    {
        await adminOps.ProcessReturnDecisionAsync(
            returnId,
            newStatus,
            officialDecisionNote ?? "Obrađeno od strane operatera.",
            restockToOwnInventory,
            "operater",
            ct);

        StatusMessage = $"Odluka za reklamaciju uspešno sačuvana (Status: {newStatus}, Vraćeno na sopstveni lager: {(restockToOwnInventory ? "DA" : "NE")}).";
        return RedirectToPage();
    }
}

using System.Text;
using Ecommerce.Application.Services;
using Ecommerce.Domain.Entities;
using Ecommerce.Domain.Enums;
using Ecommerce.Infrastructure.Persistence;
using Ecommerce.Infrastructure.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;

namespace Ecommerce.Admin.Pages;

public class OrdersModel(
    EcommerceDbContext db,
    CheckoutOrderService checkoutService,
    AdminOperationsService adminOps,
    CourierAndPaymentService courierService) : PageModel
{
    public List<Order> Orders { get; set; } = [];
    public List<CodRemittance> Remittances { get; set; } = [];
    public List<SupplierPurchaseOrder> SupplierPos { get; set; } = [];
    [TempData]
    public string? StatusMessage { get; set; }

    public async Task OnGetAsync(string? statusFilter, string? q, CancellationToken ct)
    {
        var query = db.Orders
            .AsNoTracking()
            .Include(o => o.Items)
            .Include(o => o.Shipments)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(statusFilter) && Enum.TryParse<OrderStatus>(statusFilter, out var parsedStatus))
        {
            query = query.Where(o => o.Status == parsedStatus);
        }

        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim();
            query = query.Where(o =>
                o.OrderNumber.Contains(term) ||
                o.CustomerPhoneE164.Contains(term) ||
                o.CustomerFullName.Contains(term));
        }

        Orders = await query.OrderByDescending(o => o.CreatedAt).ToListAsync(ct);
        Remittances = await db.CodRemittances.AsNoTracking().OrderByDescending(r => r.CreatedAt).Take(15).ToListAsync(ct);
        SupplierPos = await db.SupplierPurchaseOrders.AsNoTracking().OrderByDescending(p => p.CreatedAt).Take(15).ToListAsync(ct);
    }

    public async Task<IActionResult> OnPostConfirmAsync(Guid orderId, CancellationToken ct)
    {
        var order = await db.Orders.FirstOrDefaultAsync(o => o.Id == orderId, ct);
        if (order is not null)
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
            StatusMessage = $"Porudžbina {order.OrderNumber} je potvrđena i spremna za pakovanje.";
        }
        return RedirectToPage();
    }

    public async Task<IActionResult> OnPostShipAsync(
        Guid orderId,
        string carrier,
        string trackingNumber,
        string fiscalRef,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(trackingNumber) || string.IsNullOrWhiteSpace(fiscalRef))
        {
            StatusMessage = "Greška: Tracking broj i referenca fiskalnog računa su obavezni pre promene u 'Poslato' (Sekcija 05.1).";
            return RedirectToPage();
        }

        await adminOps.ShipOrderAsync(orderId, carrier, trackingNumber, fiscalRef, "operater", ct);
        StatusMessage = "Pošiljka je evidentirana kao poslata uz tracking i fiskalni broj.";
        return RedirectToPage();
    }

    public async Task<IActionResult> OnPostCancelAsync(Guid orderId, string reason, CancellationToken ct)
    {
        await checkoutService.CancelOrderAsync(orderId, "operater", string.IsNullOrWhiteSpace(reason) ? "Otkazano u adminu" : reason, ct);
        StatusMessage = "Porudžbina je otkazana, a sopstvene rezervacije zaliha su vraćene u slobodno stanje (AT-09).";
        return RedirectToPage();
    }

    public async Task<IActionResult> OnPostUnclaimedAsync(Guid orderId, decimal returnCostRsd, CancellationToken ct)
    {
        await adminOps.MarkOrderUnclaimedReturnAsync(orderId, returnCostRsd, "operater", ct);
        StatusMessage = "Evidentirana nepreuzeta pošiljka i ažuriran CustomerRiskRecord (AT-17).";
        return RedirectToPage();
    }

    public async Task<IActionResult> OnPostRemittanceAsync(Guid orderId, decimal receivedAmountRsd, string bankRef, CancellationToken ct)
    {
        var rem = await adminOps.RecordCodRemittanceAsync(orderId, receivedAmountRsd, bankRef ?? "UPLATA-KURIR", "vlasnik", ct);
        StatusMessage = rem.Status == CodRemittanceStatus.Matched
            ? "Otkupnina kurira se poklapa sa porudžbinom — status plaćanja postavljen na Paid (AT-18)."
            : $"Upozorenje: Uplata ({receivedAmountRsd:N2} RSD) ne odgovara traženom iznosu ({rem.ExpectedAmountRsd:N2} RSD) — označeno kao Discrepancy!";
        return RedirectToPage();
    }

    public async Task<IActionResult> OnPostExportCourierManifestAsync(CourierProvider provider, CancellationToken ct)
    {
        var readyOrders = await db.Orders
            .AsNoTracking()
            .Include(o => o.Items)
            .Where(o => o.Status != OrderStatus.Cancelled)
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync(ct);

        var csv = courierService.ExportCourierManifestCsv(provider, readyOrders);
        var bytes = Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(csv)).ToArray();
        var fileName = $"manifest-{provider.ToString().ToLowerInvariant()}-{DateTimeOffset.UtcNow:yyyyMMdd}.csv";
        return File(bytes, "text/csv; charset=utf-8", fileName);
    }

    public async Task<IActionResult> OnPostGenerateSupplierPoAsync(Guid orderId, CancellationToken ct)
    {
        var po = await adminOps.GenerateSupplierPurchaseOrderAsync(orderId, "operater", ct);
        StatusMessage = $"Kreirana narudžbenica dobavljaču {po.PoNumber} ({po.SupplierName}) u iznosu od {po.TotalEstimatedCostRsd:N2} RSD.";
        return RedirectToPage();
    }

    public async Task<IActionResult> OnPostImportRemittanceCsvAsync(string carrier, string csvContent, CancellationToken ct)
    {
        var summary = courierService.ParseRemittanceCsv(carrier ?? "PostExpress", csvContent ?? string.Empty);
        if (summary.TotalRows == 0)
        {
            StatusMessage = "Greška: CSV izveštaj kurira je prazan ili neispravan.";
            return RedirectToPage();
        }

        var matchedCount = 0;
        foreach (var row in summary.Rows)
        {
            var order = await db.Orders.FirstOrDefaultAsync(o => o.OrderNumber == row.OrderNumber, ct);
            if (order is not null)
            {
                await adminOps.RecordCodRemittanceAsync(order.Id, row.PaidOutRsd, row.BankReference, "vlasnik", ct);
                if (!row.HasDiscrepancy) matchedCount++;
            }
        }

        StatusMessage = $"Obrađen CSV izveštaj otkupnina ({summary.Carrier}): Ukupno redova={summary.TotalRows}, Upareno bez neslaganja={matchedCount}, Neslaganja={summary.DiscrepancyCount}.";
        return RedirectToPage();
    }
}

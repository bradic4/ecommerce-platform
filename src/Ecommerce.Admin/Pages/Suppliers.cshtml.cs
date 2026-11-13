using Ecommerce.Application.Services;
using Ecommerce.Domain.Entities;
using Ecommerce.Infrastructure.Persistence;
using Ecommerce.Infrastructure.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;

namespace Ecommerce.Admin.Pages;

public class SuppliersModel(
    EcommerceDbContext db,
    AdminOperationsService adminOps) : PageModel
{
    public List<Supplier> Suppliers { get; set; } = [];
    public List<SupplierOffer> Offers { get; set; } = [];
    public List<ImportRun> RecentRuns { get; set; } = [];
    public FeedImportPreview? LastPreview { get; set; }

    [BindProperty]
    public Guid SelectedSupplierId { get; set; }

    [BindProperty]
    public string FeedFormat { get; set; } = "CSV";

    [BindProperty]
    public bool IsDeltaFeed { get; set; } = true;

    [BindProperty]
    public string RawFeedText { get; set; } =
        "# Primer CSV feeda (SupplierSku;ProductName;Ean;Brand;PurchasePrice;Quantity)\n" +
        "SHARED-SKU-100;Aku bušilica-odvrtač 18V 2x2.0Ah u koferu;8606000001011;Bosch;8250.0000;18\n" +
        "A-INT-BRUS-850-02;Ugaona brusilica 850W 125mm;8606000001028;Makita;5150.00;14\n" +
        "NOVI-SUP-999;Novi Aku trimer za travu 20V;8606000099999;Einhell;6400.00;6";

    public async Task OnGetAsync(CancellationToken ct)
    {
        await LoadDataAsync(ct);
    }

    public async Task<IActionResult> OnPostDryRunAsync(CancellationToken ct)
    {
        LastPreview = await adminOps.ExecuteFeedImportAsync(
            SelectedSupplierId,
            RawFeedText,
            FeedFormat,
            new FeedImportOptions(DecimalSeparator: '.', IsDeltaFeed: IsDeltaFeed, IsDryRun: true),
            "vlasnik",
            ct);

        await LoadDataAsync(ct);
        return Page();
    }

    public async Task<IActionResult> OnPostApplyAsync(CancellationToken ct)
    {
        LastPreview = await adminOps.ExecuteFeedImportAsync(
            SelectedSupplierId,
            RawFeedText,
            FeedFormat,
            new FeedImportOptions(DecimalSeparator: '.', IsDeltaFeed: IsDeltaFeed, IsDryRun: false),
            "vlasnik",
            ct);

        await LoadDataAsync(ct);
        return Page();
    }

    private async Task LoadDataAsync(CancellationToken ct)
    {
        Suppliers = await db.Suppliers.AsNoTracking().OrderBy(s => s.Priority).ToListAsync(ct);
        if (SelectedSupplierId == Guid.Empty && Suppliers.Count > 0)
            SelectedSupplierId = Suppliers[0].Id;

        Offers = await db.SupplierOffers
            .AsNoTracking()
            .Include(o => o.Supplier)
            .Include(o => o.Variant)
            .OrderBy(o => o.Supplier!.Priority)
            .ThenBy(o => o.SupplierSku)
            .ToListAsync(ct);

        RecentRuns = await db.ImportRuns
            .AsNoTracking()
            .OrderByDescending(r => r.CreatedAt)
            .Take(10)
            .ToListAsync(ct);
    }
}

using Ecommerce.Domain.Entities;
using Ecommerce.Domain.Enums;
using Ecommerce.Infrastructure.Persistence;
using Ecommerce.Infrastructure.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;

namespace Ecommerce.Admin.Pages;

public class PricingModel(
    EcommerceDbContext db,
    AdminOperationsService adminOps) : PageModel
{
    [BindProperty]
    public decimal MarkupMultiplier { get; set; } = 1.35m;

    [BindProperty]
    public decimal FixedHandlingFeeRsd { get; set; } = 80m;

    [BindProperty]
    public decimal MinGrossMarginPercent { get; set; } = 18m;

    [BindProperty]
    public decimal MinProfitFloorRsd { get; set; } = 450m;

    [BindProperty]
    public decimal ExpectedUnclaimedRate { get; set; } = 0.06m;

    [BindProperty]
    public decimal EstimatedTwoWayShippingCostRsd { get; set; } = 750m;

    [BindProperty]
    public bool RoundToWholeTenRsd { get; set; } = true;

    public IReadOnlyList<PriceSimulationRow> SimulationRows { get; set; } = [];
    public List<PriceRecord> RecentPriceRecords { get; set; } = [];
    public string? StatusBanner { get; set; }

    public async Task OnGetAsync(CancellationToken ct)
    {
        var globalRule = await db.PricingRules.AsNoTracking()
            .FirstOrDefaultAsync(r => r.Scope == PricingRuleScope.Global && r.IsActive, ct);

        if (globalRule is not null)
        {
            MarkupMultiplier = globalRule.MarkupMultiplier;
            FixedHandlingFeeRsd = globalRule.FixedHandlingFeeRsd;
            MinGrossMarginPercent = globalRule.MinGrossMarginPercent;
            MinProfitFloorRsd = globalRule.MinProfitFloorRsd;
            ExpectedUnclaimedRate = globalRule.ExpectedUnclaimedRate;
            EstimatedTwoWayShippingCostRsd = globalRule.EstimatedTwoWayShippingCostRsd;
            RoundToWholeTenRsd = globalRule.RoundToWholeTenRsd;
        }

        SimulationRows = await adminOps.SimulateOrApplyPricingAsync(BuildRule(), applyChanges: false, "vlasnik", ct);
        RecentPriceRecords = await db.PriceRecords.AsNoTracking().OrderByDescending(p => p.CreatedAt).Take(15).ToListAsync(ct);
    }

    public async Task<IActionResult> OnPostSimulateAsync(CancellationToken ct)
    {
        SimulationRows = await adminOps.SimulateOrApplyPricingAsync(BuildRule(), applyChanges: false, "vlasnik", ct);
        RecentPriceRecords = await db.PriceRecords.AsNoTracking().OrderByDescending(p => p.CreatedAt).Take(15).ToListAsync(ct);
        StatusBanner = "Simulacija završena (cene u javnom katalogu još nisu promenjene).";
        return Page();
    }

    public async Task<IActionResult> OnPostApplyAsync(CancellationToken ct)
    {
        SimulationRows = await adminOps.SimulateOrApplyPricingAsync(BuildRule(), applyChanges: true, "vlasnik", ct);
        RecentPriceRecords = await db.PriceRecords.AsNoTracking().OrderByDescending(p => p.CreatedAt).Take(15).ToListAsync(ct);
        StatusBanner = "Nova pravila cena su primenjena, sačuvan je PriceRecord istorijat i poslat Outbox događaj za osvežavanje keša storefronta (AT-20).";
        return Page();
    }

    private PricingRule BuildRule() => new()
    {
        Name = "Globalno pravilo marže",
        Scope = PricingRuleScope.Global,
        MarkupMultiplier = MarkupMultiplier,
        FixedHandlingFeeRsd = FixedHandlingFeeRsd,
        MinGrossMarginPercent = MinGrossMarginPercent,
        MinProfitFloorRsd = MinProfitFloorRsd,
        ExpectedUnclaimedRate = ExpectedUnclaimedRate,
        EstimatedTwoWayShippingCostRsd = EstimatedTwoWayShippingCostRsd,
        RoundToWholeTenRsd = RoundToWholeTenRsd,
        IsActive = true
    };
}

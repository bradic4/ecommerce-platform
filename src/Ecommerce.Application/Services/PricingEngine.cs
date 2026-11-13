using Ecommerce.Domain.Entities;
using Ecommerce.Domain.Enums;

namespace Ecommerce.Application.Services;

public record PricingCalculationResult(
    decimal CostPriceRsd,
    decimal SellingPriceRsd,
    decimal MarkupPercent,
    decimal GrossMarginPercent,
    decimal ExpectedUnclaimedCostRsd,
    decimal NetContributionRsd,
    bool IsBelowProfitabilityFloor,
    string RuleExplanation);

public class PricingEngine
{
    /// <summary>
    /// Calculates authoritative server-side selling price in RSD using decimal arithmetic (Section 10 &amp; 25.2).
    /// Clearly distinguishes Markup = (Price - Cost) / Cost from Gross Margin = (Price - Cost) / Price.
    /// Includes expected unclaimed COD return cost: UnclaimedRate * TwoWayShippingCost.
    /// </summary>
    public PricingCalculationResult CalculatePrice(
        decimal normalizedCostRsd,
        IEnumerable<PricingRule> candidateRules,
        Guid? productId = null,
        Guid? categoryId = null,
        Guid? supplierId = null,
        decimal? manualOverrideRsd = null)
    {
        if (normalizedCostRsd <= 0m)
            throw new ArgumentOutOfRangeException(nameof(normalizedCostRsd), "Nabavna cena mora biti veća od 0 RSD.");

        var activeRules = candidateRules.Where(r => r.IsActive).ToList();

        // Hierarchy: Manual override > Product > Category > Supplier > Global (Section 10.2)
        var selectedRule =
            activeRules.FirstOrDefault(r => r.Scope == PricingRuleScope.Product && r.TargetEntityId == productId)
            ?? activeRules.FirstOrDefault(r => r.Scope == PricingRuleScope.Category && r.TargetEntityId == categoryId)
            ?? activeRules.FirstOrDefault(r => r.Scope == PricingRuleScope.Supplier && r.TargetEntityId == supplierId)
            ?? activeRules.FirstOrDefault(r => r.Scope == PricingRuleScope.Global)
            ?? new PricingRule { Name = "Podrazumevano globalno pravilo (x1.35)" };

        var expectedUnclaimedCost = decimal.Round(
            selectedRule.ExpectedUnclaimedRate * selectedRule.EstimatedTwoWayShippingCostRsd,
            2,
            MidpointRounding.AwayFromZero);

        decimal rawPrice;
        string explanation;

        if (manualOverrideRsd.HasValue && manualOverrideRsd.Value > 0m)
        {
            rawPrice = manualOverrideRsd.Value;
            explanation = $"Ručni override cene ({rawPrice:N2} RSD)";
        }
        else
        {
            var baseWithMarkup = (normalizedCostRsd * selectedRule.MarkupMultiplier)
                                 + selectedRule.FixedHandlingFeeRsd
                                 + expectedUnclaimedCost;

            var minByFloor = normalizedCostRsd + selectedRule.MinProfitFloorRsd + expectedUnclaimedCost;
            var minByGrossMargin = selectedRule.MinGrossMarginPercent is > 0m and < 95m
                ? (normalizedCostRsd + expectedUnclaimedCost) / (1m - (selectedRule.MinGrossMarginPercent / 100m))
                : minByFloor;

            rawPrice = Math.Max(baseWithMarkup, Math.Max(minByFloor, minByGrossMargin));

            if (selectedRule.RoundToWholeTenRsd)
            {
                rawPrice = Math.Ceiling(rawPrice / 10m) * 10m;
            }
            else
            {
                rawPrice = decimal.Round(rawPrice, 2, MidpointRounding.AwayFromZero);
            }

            explanation =
                $"Pravilo '{selectedRule.Name}' ({selectedRule.Scope}): nabavna {normalizedCostRsd:N2} RSD × {selectedRule.MarkupMultiplier:N2} " +
                $"+ zavisni/COD rizik {expectedUnclaimedCost:N2} RSD (min. doprinos {selectedRule.MinProfitFloorRsd:N0} RSD) => {rawPrice:N2} RSD";
        }

        var markupPercent = decimal.Round(((rawPrice - normalizedCostRsd) / normalizedCostRsd) * 100m, 2, MidpointRounding.AwayFromZero);
        var grossMarginPercent = decimal.Round(((rawPrice - normalizedCostRsd) / rawPrice) * 100m, 2, MidpointRounding.AwayFromZero);
        var netContribution = decimal.Round(rawPrice - normalizedCostRsd - selectedRule.FixedHandlingFeeRsd - expectedUnclaimedCost, 2, MidpointRounding.AwayFromZero);
        var isBelowFloor = netContribution < selectedRule.MinProfitFloorRsd || grossMarginPercent < selectedRule.MinGrossMarginPercent;

        return new PricingCalculationResult(
            CostPriceRsd: decimal.Round(normalizedCostRsd, 2),
            SellingPriceRsd: rawPrice,
            MarkupPercent: markupPercent,
            GrossMarginPercent: grossMarginPercent,
            ExpectedUnclaimedCostRsd: expectedUnclaimedCost,
            NetContributionRsd: netContribution,
            IsBelowProfitabilityFloor: isBelowFloor,
            RuleExplanation: explanation);
    }
}

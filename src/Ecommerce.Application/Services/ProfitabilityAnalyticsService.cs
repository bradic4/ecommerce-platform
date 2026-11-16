using Ecommerce.Domain.Entities;
using Ecommerce.Domain.Enums;

namespace Ecommerce.Application.Services;

public record SkuProfitabilityRow(
    string Sku,
    string ProductName,
    int UnitsSold,
    decimal GrossRevenueRsd,
    decimal TotalCostRsd,
    decimal GrossProfitRsd,
    decimal GrossMarginPercent,
    int OwnStockUnits,
    int SupplierUnits);

public record StoreFinancialSnapshot(
    int TotalOrdersCount,
    int ActiveOrCompletedOrdersCount,
    int CancelledOrdersCount,
    int UnclaimedShipmentsCount,
    decimal RealizedPaidRevenueRsd,
    decimal PendingCodInTransitRsd,
    decimal TotalActiveSubtotalRsd,
    decimal TotalDiscountsGrantedRsd,
    decimal TotalCogsRsd,
    decimal TotalUnclaimedReturnCostRsd,
    decimal EstimatedNetProfitRsd,
    decimal EstimatedNetMarginPercent,
    decimal ActualUnclaimedRatePercent,
    decimal ConfiguredExpectedUnclaimedRatePercent,
    string UnclaimedRateAdvisory,
    IReadOnlyList<SkuProfitabilityRow> TopSkusByProfit);

public class ProfitabilityAnalyticsService
{
    public StoreFinancialSnapshot ComputeSnapshot(
        IReadOnlyList<Order> orders,
        IReadOnlyList<Shipment> shipments,
        PricingRule? globalRule)
    {
        var activeOrders = orders.Where(o => o.Status != OrderStatus.Cancelled).ToList();
        var cancelledOrders = orders.Where(o => o.Status == OrderStatus.Cancelled).ToList();

        var realizedPaidRsd = activeOrders
            .Where(o => o.PaymentStatus == PaymentStatus.Paid)
            .Sum(o => o.TotalRsd);

        var pendingCodRsd = activeOrders
            .Where(o => o.PaymentStatus != PaymentStatus.Paid)
            .Sum(o => o.TotalRsd);

        var totalActiveSubtotal = activeOrders.Sum(o => o.SubtotalRsd);
        var totalDiscounts = activeOrders.Sum(o => o.DiscountRsd);
        var totalCogs = activeOrders
            .SelectMany(o => o.Items)
            .Sum(i => i.UnitCostSnapshotRsd * i.Quantity);

        var unclaimedShipments = shipments.Where(s => s.UnclaimedAt.HasValue || s.Status == "UnclaimedReturn").ToList();
        var totalUnclaimedReturnCost = unclaimedShipments.Sum(s => s.ReturnShippingCostRsd);

        var netRevenueAfterDiscounts = Math.Max(0m, totalActiveSubtotal - totalDiscounts);
        var estimatedNetProfit = netRevenueAfterDiscounts - totalCogs - totalUnclaimedReturnCost;
        var estimatedNetMarginPercent = netRevenueAfterDiscounts > 0m
            ? Math.Round((estimatedNetProfit / netRevenueAfterDiscounts) * 100m, 2)
            : 0m;

        var totalDispatchedOrUnclaimed = Math.Max(1, shipments.Count);
        var actualUnclaimedRatePercent = shipments.Count > 0
            ? Math.Round(((decimal)unclaimedShipments.Count / totalDispatchedOrUnclaimed) * 100m, 2)
            : 0m;

        var configuredExpectedPercent = globalRule is not null
            ? Math.Round(globalRule.ExpectedUnclaimedRate * 100m, 2)
            : 6.00m;

        var advisory = actualUnclaimedRatePercent > configuredExpectedPercent
            ? $"UPOZORENJE: Stvarna stopa nepreuzetih paketa ({actualUnclaimedRatePercent:N2}%) prelazi ugrađenu stopu u cenama ({configuredExpectedPercent:N2}%). Preporučujemo povećanje ExpectedUnclaimedRate parametra u sekciji Cene & Marže."
            : $"OK: Stvarna stopa nepreuzetih paketa ({actualUnclaimedRatePercent:N2}%) je u okviru zaštitnog praga ugrađenog u prodajne cene ({configuredExpectedPercent:N2}%).";

        var skuRows = activeOrders
            .SelectMany(o => o.Items)
            .GroupBy(i => i.SkuSnapshot)
            .Select(g =>
            {
                var first = g.First();
                var units = g.Sum(x => x.Quantity);
                var rev = g.Sum(x => x.LineTotalRsd);
                var cost = g.Sum(x => x.UnitCostSnapshotRsd * x.Quantity);
                var profit = rev - cost;
                var marginPct = rev > 0m ? Math.Round((profit / rev) * 100m, 2) : 0m;
                var ownUnits = g.Where(x => x.FulfillmentSource == "OwnStock").Sum(x => x.Quantity);
                var supUnits = units - ownUnits;

                return new SkuProfitabilityRow(
                    Sku: g.Key,
                    ProductName: first.ProductNameSnapshot,
                    UnitsSold: units,
                    GrossRevenueRsd: rev,
                    TotalCostRsd: cost,
                    GrossProfitRsd: profit,
                    GrossMarginPercent: marginPct,
                    OwnStockUnits: ownUnits,
                    SupplierUnits: supUnits);
            })
            .OrderByDescending(r => r.GrossProfitRsd)
            .ToList();

        return new StoreFinancialSnapshot(
            TotalOrdersCount: orders.Count,
            ActiveOrCompletedOrdersCount: activeOrders.Count,
            CancelledOrdersCount: cancelledOrders.Count,
            UnclaimedShipmentsCount: unclaimedShipments.Count,
            RealizedPaidRevenueRsd: realizedPaidRsd,
            PendingCodInTransitRsd: pendingCodRsd,
            TotalActiveSubtotalRsd: totalActiveSubtotal,
            TotalDiscountsGrantedRsd: totalDiscounts,
            TotalCogsRsd: totalCogs,
            TotalUnclaimedReturnCostRsd: totalUnclaimedReturnCost,
            EstimatedNetProfitRsd: estimatedNetProfit,
            EstimatedNetMarginPercent: estimatedNetMarginPercent,
            ActualUnclaimedRatePercent: actualUnclaimedRatePercent,
            ConfiguredExpectedUnclaimedRatePercent: configuredExpectedPercent,
            UnclaimedRateAdvisory: advisory,
            TopSkusByProfit: skuRows);
    }
}

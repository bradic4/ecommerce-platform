using Ecommerce.Domain.Common;
using Ecommerce.Domain.Entities;
using Ecommerce.Domain.Enums;

namespace Ecommerce.Application.Services;

public record CouponEvaluationResult(
    bool IsValid,
    string? CouponCode,
    decimal DiscountRsd,
    bool WasCappedByMarginFloor,
    string Message);

public class PromotionAndReturnService
{
    /// <summary>
    /// Evaluates a promotional coupon against an order subtotal and total cost, enforcing minimum profit floor protection (Section 10 &amp; 23).
    /// </summary>
    public CouponEvaluationResult EvaluateCoupon(
        Coupon? coupon,
        decimal subtotalRsd,
        decimal totalOrderCostRsd,
        decimal minOrderProfitFloorRsd,
        DateTimeOffset nowUtc)
    {
        if (coupon is null || !coupon.IsActive)
        {
            return new CouponEvaluationResult(false, null, 0m, false, "Promo kod nije pronađen ili nije aktivan.");
        }

        if (coupon.ExpiresAt.HasValue && coupon.ExpiresAt.Value < nowUtc)
        {
            return new CouponEvaluationResult(false, coupon.Code, 0m, false, "Promo kod je istekao.");
        }

        if (coupon.CurrentUses >= coupon.MaxUses)
        {
            return new CouponEvaluationResult(false, coupon.Code, 0m, false, "Promo kod je dostigao maksimalan broj iskoristivosti.");
        }

        if (subtotalRsd < coupon.MinSubtotalRsd)
        {
            return new CouponEvaluationResult(
                false,
                coupon.Code,
                0m,
                false,
                $"Minimalni iznos korpe za kod '{coupon.Code}' je {coupon.MinSubtotalRsd:N0} RSD.");
        }

        var rawDiscount = 0m;
        if (coupon.DiscountPercent > 0m)
        {
            rawDiscount += Math.Round(subtotalRsd * (coupon.DiscountPercent / 100m), 2, MidpointRounding.AwayFromZero);
        }
        if (coupon.FixedDiscountRsd > 0m)
        {
            rawDiscount += coupon.FixedDiscountRsd;
        }

        var wasCapped = false;
        if (coupon.ProtectMinimumMarginFloor && totalOrderCostRsd > 0m)
        {
            var maxAllowedDiscount = Math.Max(0m, subtotalRsd - totalOrderCostRsd - minOrderProfitFloorRsd);
            if (rawDiscount > maxAllowedDiscount)
            {
                rawDiscount = Math.Round(maxAllowedDiscount, 2, MidpointRounding.AwayFromZero);
                wasCapped = true;
            }
        }

        if (rawDiscount <= 0m)
        {
            return new CouponEvaluationResult(
                false,
                coupon.Code,
                0m,
                wasCapped,
                "Artikli u korpi su već na minimalnom pragu marže i ne podležu dodatnom popustu.");
        }

        var msg = wasCapped
            ? $"Primenen promo kod '{coupon.Code}' (popust prilagođen zaštitnom pragu marže: -{rawDiscount:N0} RSD)."
            : $"Uspešno primenjen promo kod '{coupon.Code}' (-{rawDiscount:N0} RSD).";

        return new CouponEvaluationResult(true, coupon.Code, rawDiscount, wasCapped, msg);
    }

    /// <summary>
    /// Creates a statutory ReturnRequest (RMA) in accordance with the Serbian Consumer Protection Law (Zakon o zaštiti potrošača RS - Section 04.1, 15, 22).
    /// - 8-day mandatory deadline to respond to a consumer warranty/reclamation claim.
    /// - 15-day statutory deadline to resolve a warranty claim (or 14 days to refund a statutory withdrawal).
    /// </summary>
    public ReturnRequest CreateStatutoryReturnRequest(
        string orderNumber,
        Guid? orderId,
        string customerFullName,
        string customerEmail,
        string customerPhone,
        string productSkuOrName,
        int quantity,
        ReturnRequestType type,
        string reasonDescription,
        string? bankAccountForRefund,
        decimal estimatedRefundRsd,
        DateTimeOffset submittedAtUtc)
    {
        string normalizedPhone;
        try
        {
            normalizedPhone = SerbianTextNormalizer.NormalizePhoneE164(customerPhone);
        }
        catch
        {
            normalizedPhone = customerPhone.Trim();
        }
        var rmaNumber = $"RMA-{submittedAtUtc:yyyyMMdd}-{Random.Shared.Next(1000, 9999)}";

        var responseDeadline = submittedAtUtc.AddDays(8);
        var resolutionDeadline = type == ReturnRequestType.Withdrawal14Days
            ? submittedAtUtc.AddDays(14)
            : submittedAtUtc.AddDays(15);

        return new ReturnRequest
        {
            RmaNumber = rmaNumber,
            OrderId = orderId,
            OrderNumber = orderNumber.Trim().ToUpperInvariant(),
            CustomerFullName = customerFullName.Trim(),
            CustomerEmail = customerEmail.Trim(),
            CustomerPhoneE164 = normalizedPhone,
            ProductSkuOrName = productSkuOrName.Trim(),
            Quantity = Math.Max(1, quantity),
            Type = type,
            Status = ReturnRequestStatus.Submitted,
            ReasonDescription = reasonDescription.Trim(),
            CustomerBankAccountForRefund = bankAccountForRefund?.Trim(),
            RefundAmountRsd = Math.Max(0m, estimatedRefundRsd),
            CreatedAt = submittedAtUtc,
            UpdatedAt = submittedAtUtc,
            StatutoryResponseDeadlineAt = responseDeadline,
            StatutoryResolutionDeadlineAt = resolutionDeadline
        };
    }
}

using System.Text;
using Ecommerce.Domain.Entities;
using Ecommerce.Domain.Enums;

namespace Ecommerce.Application.Services;

public record RenderedEmail(
    string TemplateName,
    string Recipient,
    string Subject,
    string BodyHtml,
    string ReferenceId);

public class TransactionalEmailRenderer
{
    public RenderedEmail RenderOrderPlacedEmail(Order order)
    {
        var sb = new StringBuilder();
        sb.AppendLine("<div style='font-family:Arial,sans-serif;max-width:620px;margin:0 auto;color:#101c32;'>");
        sb.AppendLine($"<h2 style='color:#0f807f;'>Potvrda prijema porudžbine #{order.OrderNumber}</h2>");
        sb.AppendLine($"<p>Poštovani/a <strong>{order.CustomerFullName}</strong>,</p>");
        sb.AppendLine("<p>Hvala vam na kupovini u prodavnici <strong>Alati &amp; Domaćinstvo</strong>. Vaša porudžbina je uspešno primljena i trenutno je u obradi.</p>");

        sb.AppendLine("<table style='width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;'>");
        sb.AppendLine("<thead><tr style='background:#f1f5f9;text-align:left;'><th style='padding:8px;border:1px solid #cbd5e1;'>Artikal</th><th style='padding:8px;border:1px solid #cbd5e1;'>Kol.</th><th style='padding:8px;border:1px solid #cbd5e1;'>Iznos (RSD)</th></tr></thead><tbody>");
        foreach (var item in order.Items)
        {
            sb.AppendLine($"<tr><td style='padding:8px;border:1px solid #cbd5e1;'>{item.ProductNameSnapshot} (<code>{item.SkuSnapshot}</code>)</td><td style='padding:8px;border:1px solid #cbd5e1;'>{item.Quantity}</td><td style='padding:8px;border:1px solid #cbd5e1;'>{item.LineTotalRsd:N2} RSD</td></tr>");
        }
        sb.AppendLine("</tbody></table>");

        sb.AppendLine($"<p><strong>Međuzbir:</strong> {order.SubtotalRsd:N2} RSD<br/>");
        if (order.DiscountRsd > 0m)
        {
            sb.AppendLine($"<strong>Popust ({order.CouponCode}):</strong> -{order.DiscountRsd:N2} RSD<br/>");
        }
        sb.AppendLine($"<strong>Dostava:</strong> {order.ShippingCostRsd:N2} RSD<br/>");
        sb.AppendLine($"<strong style='font-size:16px;'>Ukupno za plaćanje: {order.TotalRsd:N2} RSD</strong></p>");

        var paymentDesc = order.PaymentMethod == PaymentMethod.BankTransfer
            ? "Uplata na račun (NBS IPS QR / m-banking)"
            : "Plaćanje pouzećem (gotovinom kuriru prilikom preuzimanja)";
        sb.AppendLine($"<p><strong>Način plaćanja:</strong> {paymentDesc}<br/>");
        sb.AppendLine($"<strong>Adresa isporuke:</strong> {order.ShippingStreet}, {order.ShippingPostalCode} {order.ShippingCity}</p>");

        if (!string.IsNullOrWhiteSpace(order.IpsQrPayload))
        {
            sb.AppendLine($"<div style='background:#f0fdfa;border:1px solid #99f6e4;padding:12px;border-radius:6px;font-size:12px;'><strong>NBS IPS QR zapis za m-banking:</strong><br/><code>{order.IpsQrPayload}</code></div>");
        }

        sb.AppendLine("<hr style='margin:20px 0;border:none;border-top:1px solid #e2e8f0;'/>");
        sb.AppendLine("<p style='font-size:12px;color:#475569;'><strong>Pouka o pravu na odustanak od ugovora (Zakon o zaštiti potrošača RS, čl. 26–36):</strong> Kupac ima pravo da u roku od 14 kalendarskih dana od dana prijema robe odustane od ugovora zaključenog na daljinu bez navođenja razloga, popunjavanjem obrasca na stranici <code>/reklamacije</code> ili slanjem izjave na našu email adresu.</p>");
        sb.AppendLine("</div>");

        return new RenderedEmail(
            TemplateName: "OrderPlaced",
            Recipient: order.CustomerEmail,
            Subject: $"Potvrda porudžbine #{order.OrderNumber} — Alati & Domaćinstvo",
            BodyHtml: sb.ToString(),
            ReferenceId: order.OrderNumber);
    }

    public RenderedEmail RenderOrderShippedEmail(Order order, Shipment shipment)
    {
        var sb = new StringBuilder();
        sb.AppendLine("<div style='font-family:Arial,sans-serif;max-width:620px;margin:0 auto;color:#101c32;'>");
        sb.AppendLine($"<h2 style='color:#0f807f;'>Vaša pošiljka za porudžbinu #{order.OrderNumber} je poslata!</h2>");
        sb.AppendLine($"<p>Poštovani/a <strong>{order.CustomerFullName}</strong>,</p>");
        sb.AppendLine("<p>Vaš paket je spakovan i predat kurirskoj službi.</p>");
        sb.AppendLine("<div style='background:#f8fafc;border:1px solid #cbd5e1;padding:14px;border-radius:6px;'>");
        sb.AppendLine($"<strong>Kurirska služba:</strong> {shipment.Carrier}<br/>");
        sb.AppendLine($"<strong>Broj za praćenje pošiljke (Tracking):</strong> <code>{shipment.TrackingNumber}</code><br/>");
        sb.AppendLine($"<strong>Broj fiskalnog računa (PFR):</strong> <code>{order.FiscalDocumentRef ?? "-"}</code><br/>");
        sb.AppendLine($"<strong>Iznos za pripremu kuriru (pouzeće):</strong> {shipment.CodAmountRsd:N2} RSD");
        sb.AppendLine("</div>");
        sb.AppendLine("<p style='font-size:13px;color:#475569;margin-top:14px;'>Molimo vas da budete dostupni na kontakt telefonu <strong>" + order.CustomerPhoneE164 + "</strong> prilikom dolaska kurira.</p>");
        sb.AppendLine("</div>");

        return new RenderedEmail(
            TemplateName: "OrderShipped",
            Recipient: order.CustomerEmail,
            Subject: $"Pošiljka poslata ({shipment.Carrier} #{shipment.TrackingNumber}) — Porudžbina #{order.OrderNumber}",
            BodyHtml: sb.ToString(),
            ReferenceId: order.OrderNumber);
    }

    public RenderedEmail RenderReturnSubmittedEmail(ReturnRequest rma)
    {
        var sb = new StringBuilder();
        sb.AppendLine("<div style='font-family:Arial,sans-serif;max-width:620px;margin:0 auto;color:#101c32;'>");
        sb.AppendLine($"<h2 style='color:#0f807f;'>Potvrda prijema reklamacije / zahteva #{rma.RmaNumber}</h2>");
        sb.AppendLine($"<p>Poštovani/a <strong>{rma.CustomerFullName}</strong>,</p>");
        sb.AppendLine($"<p>Vaš zahtev vezan za porudžbinu <strong>{rma.OrderNumber}</strong> ({rma.Quantity}x {rma.ProductSkuOrName}) je zaveden u elektronskoj knjizi reklamacija pod brojem <strong>{rma.RmaNumber}</strong>.</p>");
        sb.AppendLine("<div style='background:#f8fafc;border:1px solid #cbd5e1;padding:12px;border-radius:6px;font-size:13px;'>");
        sb.AppendLine($"<strong>Zakonski rok za odgovor (8 dana):</strong> {rma.StatutoryResponseDeadlineAt:dd.MM.yyyy.}<br/>");
        sb.AppendLine($"<strong>Zakonski rok za rešavanje (15 dana):</strong> {rma.StatutoryResolutionDeadlineAt:dd.MM.yyyy.}");
        sb.AppendLine("</div>");
        sb.AppendLine("</div>");

        return new RenderedEmail(
            TemplateName: "ReturnSubmitted",
            Recipient: string.IsNullOrWhiteSpace(rma.CustomerEmail) ? "kupac@evidencija.rs" : rma.CustomerEmail,
            Subject: $"Potvrda prijema zahteva #{rma.RmaNumber} (Porudžbina {rma.OrderNumber})",
            BodyHtml: sb.ToString(),
            ReferenceId: rma.RmaNumber);
    }
}

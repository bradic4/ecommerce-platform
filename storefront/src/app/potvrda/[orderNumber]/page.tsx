import type { Metadata } from "next";
import Link from "next/link";
import React from "react";
import { API_BASE_URL, formatRsd } from "@/lib/api";

// Section 04.2 & 14.1: Confirmation page must never be indexed by search engines
export const metadata: Metadata = {
  title: "Potvrda porudžbine",
  robots: {
    index: false,
    follow: false,
  },
};

interface OrderLookupDto {
  orderNumber: string;
  publicStatus: string;
  paymentMethod: string;
  paymentMethodCode?: string;
  subtotalRsd: number;
  discountRsd?: number;
  couponCode?: string;
  shippingCostRsd: number;
  totalRsd: number;
  currency: string;
  ipsQrPayload?: string;
  createdAt: string;
  shippingCity: string;
  shipments?: {
    carrier: string;
    trackingNumber?: string;
    status: string;
  }[];
  items: {
    productNameSnapshot: string;
    skuSnapshot: string;
    quantity: number;
    unitPriceRsd: number;
    lineTotalRsd: number;
  }[];
}

export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;

  let order: OrderLookupDto | null = null;
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/v1/orders/lookup?orderNumber=${encodeURIComponent(
        orderNumber
      )}`,
      { cache: "no-store" }
    );
    if (res.ok) {
      order = await res.json();
    }
  } catch {
    order = null;
  }

  return (
    <div className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-8 shadow-xs">
      <span className="inline-block rounded bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 uppercase">
        Porudžbina Uspešno Evidentirana
      </span>

      <h1 className="mt-3 text-2xl font-extrabold text-[#101c32]">
        Hvala na poverenju! Broj vaše porudžbine:{" "}
        <span className="text-[#0f807f]">{orderNumber}</span>
      </h1>

      <p className="mt-2 text-sm text-slate-600 leading-relaxed">
        Vaša porudžbina je zabeležena u našem sistemu. Operater će proveriti fizičko stanje i poslati vam
        obaveštenje sa brojem za praćenje pošiljke (tracking) čim paket bude predat kurirskoj službi.
      </p>

      {order && (
        <div className="mt-6 space-y-4 border-t border-slate-200 pt-5 text-sm">
          <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-4 text-xs">
            <div>
              <span className="text-slate-500 block">Status porudžbine:</span>
              <strong className="text-slate-800">{order.publicStatus}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Mesto isporuke:</span>
              <strong className="text-slate-800">{order.shippingCity}</strong>
            </div>
            <div className="col-span-2">
              <span className="text-slate-500 block">Način plaćanja:</span>
              <strong className="text-slate-800">{order.paymentMethod}</strong>
            </div>
          </div>

          <h2 className="font-bold text-[#101c32]">Poručene stavke:</h2>
          <ul className="divide-y divide-slate-200 border-t border-b border-slate-200">
            {order.items.map((item, idx) => (
              <li
                key={idx}
                className="flex items-center justify-between py-2.5 text-xs"
              >
                <div>
                  <span className="font-semibold text-slate-800">
                    {item.productNameSnapshot}
                  </span>{" "}
                  <span className="text-slate-500">
                    ({item.quantity} × {formatRsd(item.unitPriceRsd)})
                  </span>
                </div>
                <span className="font-bold text-slate-900">
                  {formatRsd(item.lineTotalRsd)}
                </span>
              </li>
            ))}
          </ul>

          <div className="space-y-1 text-right text-sm">
            <div className="text-xs text-slate-600">
              Međuzbir: {formatRsd(order.subtotalRsd)}
              {(order.discountRsd ?? 0) > 0 && (
                <span className="ml-2 font-semibold text-emerald-700">
                  | Popust ({order.couponCode}): -{formatRsd(order.discountRsd || 0)}
                </span>
              )}{" "}
              | Dostava: {formatRsd(order.shippingCostRsd)}
            </div>
            <div className="text-lg font-extrabold text-[#101c32]">
              Ukupno za plaćanje: {formatRsd(order.totalRsd)}
            </div>
          </div>

          {order.ipsQrPayload && (
            <div className="rounded-lg border border-teal-200 bg-teal-50/60 p-4 text-xs">
              <div className="flex items-center justify-between mb-1">
                <strong className="text-[#101c32]">
                  NBS IPS Instant Plaćanje (m-banking nalog za prenos)
                </strong>
                <span className="rounded bg-[#0f807f] px-2 py-0.5 text-[10px] font-bold text-white">
                  NBS IPS QR v01
                </span>
              </div>
              <p className="text-slate-600 mb-2">
                Ukoliko želite da platite odmah putem mobilnog bankarstva (IPS Skeniraj) ili opštom uplatnicom, standardizovani NBS IPS zapis za vašu porudžbinu glasi:
              </p>
              <code className="block break-all rounded border border-slate-200 bg-white p-2.5 font-mono text-[11px] text-slate-800">
                {order.ipsQrPayload}
              </code>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/"
          className="rounded-md bg-[#101c32] px-5 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition"
        >
          Povratak na početnu stranu
        </Link>
        <Link
          href="/uslovi-kupovine"
          className="rounded-md border border-slate-300 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          Informacije o isporuci i pravima potrošača
        </Link>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import { API_BASE_URL, formatRsd } from "@/lib/api";
import { loadTrainingDb } from "@/lib/training-store";

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
  items: {
    productNameSnapshot: string;
    skuSnapshot: string;
    quantity: number;
    unitPriceRsd: number;
    lineTotalRsd: number;
  }[];
}

export default function OrderConfirmationPage() {
  const params = useParams<{ orderNumber: string }>();
  const orderNumber = decodeURIComponent(params.orderNumber || "");
  const [order, setOrder] = useState<OrderLookupDto | null>(null);

  useEffect(() => {
    if (!orderNumber) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/v1/orders/lookup?orderNumber=${encodeURIComponent(
            orderNumber
          )}`,
          { cache: "no-store" }
        );
        if (res.ok) {
          const data: OrderLookupDto = await res.json();
          if (!cancelled) {
            setOrder(data);
            return;
          }
        }
      } catch {
        // Fallback to local training DB
      }

      if (!cancelled) {
        const db = loadTrainingDb();
        const found = db.orders.find(
          (o) => o.orderNumber.toUpperCase() === orderNumber.toUpperCase()
        );
        if (found) {
          setOrder({
            orderNumber: found.orderNumber,
            publicStatus:
              found.status === "PendingConfirmation"
                ? "Primljena — čeka potvrdu operatera"
                : found.status === "Confirmed"
                  ? "Potvrđena — u pripremi za slanje"
                  : found.status === "Dispatched"
                    ? `Poslato (${found.courierName || "Kurir"}: ${found.trackingNumber || ""})`
                    : found.status,
            paymentMethod:
              found.paymentMethod === "IpsQr"
                ? "Uplata na račun (NBS IPS QR)"
                : "Plaćanje pouzećem (gotovina kuriru)",
            subtotalRsd: found.subtotalRsd,
            discountRsd: found.discountRsd,
            couponCode: found.appliedCouponCode,
            shippingCostRsd: found.shippingRsd,
            totalRsd: found.totalRsd,
            currency: "RSD",
            ipsQrPayload:
              found.paymentMethod === "IpsQr"
                ? `K:PR|V:01|C:1|R:160000000123456789|N:NALAGERU DOO BEOGRAD|I:RSD${found.totalRsd},00|SF:289|S:Porudzbina ${found.orderNumber}`
                : undefined,
            createdAt: found.createdAt,
            shippingCity: found.city,
            items: found.items.map((i) => ({
              productNameSnapshot: i.productName,
              skuSnapshot: i.sku,
              quantity: i.quantity,
              unitPriceRsd: i.unitPriceRsd,
              lineTotalRsd: i.lineTotalRsd,
            })),
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [orderNumber]);

  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 shadow-xs">
      <span className="inline-block rounded-md bg-stock-50 px-3 py-1 text-xs font-bold text-stock-700 border border-stock-100 uppercase">
        Porudžbina Uspešno Evidentirana
      </span>

      <h1 className="mt-3 text-2xl font-extrabold text-brand-700">
        Hvala na poverenju! Broj vaše porudžbine:{" "}
        <span className="font-mono text-brand-600">{orderNumber}</span>
      </h1>

      <p className="mt-2 text-sm text-slate-600 leading-relaxed">
        Vaša porudžbina je zabeležena u sistemu{" "}
        <strong>NaLageru.rs</strong>. Operater u{" "}
        <Link href="/admin" className="font-bold text-brand-700 underline">
          Operativnom Admin centru
        </Link>{" "}
        može odmah potvrditi porudžbinu, uneti broj pošiljke i odštampati
        otpremnicu.
      </p>

      {order && (
        <div className="mt-6 space-y-4 border-t border-slate-200 pt-5 text-sm">
          <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-xs">
            <div>
              <span className="text-slate-500 block">Status porudžbine:</span>
              <strong className="text-brand-700">{order.publicStatus}</strong>
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

          <h2 className="font-bold text-brand-700">Poručene stavke:</h2>
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
                  <span className="text-slate-500 tabular-nums">
                    ({item.quantity} × {formatRsd(item.unitPriceRsd)})
                  </span>
                </div>
                <span className="font-bold text-brand-700 tabular-nums">
                  {formatRsd(item.lineTotalRsd)}
                </span>
              </li>
            ))}
          </ul>

          <div className="space-y-1 text-right text-sm">
            <div className="text-xs text-slate-600 tabular-nums">
              Međuzbir: {formatRsd(order.subtotalRsd)}
              {(order.discountRsd ?? 0) > 0 && (
                <span className="ml-2 font-semibold text-stock-600">
                  | Popust ({order.couponCode}): -
                  {formatRsd(order.discountRsd || 0)}
                </span>
              )}{" "}
              | Dostava: {formatRsd(order.shippingCostRsd)}
            </div>
            <div className="text-lg font-extrabold text-brand-700 tabular-nums">
              Ukupno za plaćanje: {formatRsd(order.totalRsd)}
            </div>
          </div>

          {order.ipsQrPayload && (
            <div className="rounded-xl border border-brand-200 bg-brand-50/60 p-4 text-xs">
              <div className="flex items-center justify-between mb-1">
                <strong className="text-brand-700">
                  NBS IPS Instant Plaćanje (m-banking nalog za prenos)
                </strong>
                <span className="rounded bg-brand-700 px-2 py-0.5 text-[10px] font-bold text-accent-400">
                  NBS IPS QR v01
                </span>
              </div>
              <p className="text-slate-600 mb-2">
                Ukoliko želite da platite odmah putem mobilnog bankarstva (IPS
                Skeniraj), standardizovani NBS IPS zapis za vašu porudžbinu
                glasi:
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
          className="rounded-lg bg-brand-700 px-5 py-2.5 text-xs font-bold text-white hover:bg-brand-600 transition"
        >
          Povratak na početnu stranu
        </Link>
        <Link
          href="/admin"
          className="rounded-lg bg-accent-400 px-4 py-2.5 text-xs font-extrabold text-brand-800 hover:bg-accent-300 transition"
        >
          Otvori porudžbinu u Operativnom Adminu
        </Link>
      </div>
    </div>
  );
}

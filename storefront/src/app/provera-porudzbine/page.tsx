"use client";

import Link from "next/link";
import React, { useState } from "react";
import { API_BASE_URL, formatRsd } from "@/lib/api";
import { loadTrainingDb } from "@/lib/training-store";

interface OrderLookupResult {
  orderNumber: string;
  publicStatus: string;
  paymentMethod: string;
  subtotalRsd: number;
  shippingCostRsd: number;
  totalRsd: number;
  currency: string;
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

export default function OrderLookupPage() {
  const [orderNumber, setOrderNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OrderLookupResult | null>(null);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = orderNumber.trim();
    if (!clean) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/orders/lookup?orderNumber=${encodeURIComponent(clean)}`
      );
      if (res.ok) {
        const data = await res.json();
        setResult(data);
        setLoading(false);
        return;
      }
    } catch {
      // Fallback to local training database
    }

    const db = loadTrainingDb();
    const found = db.orders.find(
      (o) => o.orderNumber.toUpperCase() === clean.toUpperCase()
    );
    if (found) {
      setResult({
        orderNumber: found.orderNumber,
        publicStatus:
          found.status === "PendingConfirmation"
            ? "Primljena — čeka potvrdu operatera"
            : found.status === "Confirmed"
              ? "Potvrđena — u pripremi za slanje"
              : found.status === "Dispatched"
                ? `Poslato (${found.courierName || "Kurir"}: ${found.trackingNumber || ""})`
                : found.status === "DeliveredPaid"
                  ? "Isporučeno i naplaćeno"
                  : found.status,
        paymentMethod:
          found.paymentMethod === "IpsQr"
            ? "Uplata na račun (NBS IPS QR)"
            : "Plaćanje pouzećem (gotovina kuriru)",
        subtotalRsd: found.subtotalRsd,
        shippingCostRsd: found.shippingRsd,
        totalRsd: found.totalRsd,
        currency: "RSD",
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
    } else {
      setError(
        "Porudžbina sa unetim brojem nije pronađena (probajte npr. ORD-20261119-001)."
      );
    }
    setLoading(false);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <nav className="mb-4 text-xs text-slate-500">
        <Link href="/" className="hover:text-brand-700">
          Početna
        </Link>{" "}
        /{" "}
        <span className="font-semibold text-slate-800">Status porudžbine</span>
      </nav>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <h1 className="text-xl font-extrabold text-brand-700 sm:text-2xl">
          Provera statusa porudžbine (bez registracije)
        </h1>
        <p className="mt-1 text-xs text-slate-600">
          Unesite broj porudžbine koji ste dobili nakon potvrde kupovine (npr.{" "}
          <code className="font-mono font-bold text-brand-700">
            ORD-20261119-001
          </code>{" "}
          ili{" "}
          <code className="font-mono font-bold text-brand-700">
            ORD-20261118-019
          </code>
          ).
        </p>

        <form onSubmit={handleLookup} className="mt-4 flex flex-wrap gap-2">
          <input
            type="text"
            required
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="ORD-20261119-001"
            className="flex-1 rounded-lg border border-slate-300 px-3.5 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="cursor-pointer rounded-lg bg-brand-700 px-5 py-2 text-sm font-bold text-white hover:bg-brand-600 transition disabled:opacity-50"
          >
            {loading ? "Provera..." : "Proveri status"}
          </button>
        </form>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-800">
            {error}
          </div>
        )}

        {result && (
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div>
                <span className="text-xs text-slate-500">Broj porudžbine:</span>
                <div className="text-base font-extrabold text-brand-700 font-mono">
                  {result.orderNumber}
                </div>
              </div>
              <span className="rounded-full bg-stock-50 px-3 py-1 text-xs font-bold text-stock-700 border border-stock-100">
                {result.publicStatus}
              </span>
            </div>

            <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
              <div>
                Mesto isporuke: <strong>{result.shippingCity}</strong>
              </div>
              <div>
                Način plaćanja: <strong>{result.paymentMethod}</strong>
              </div>
            </div>

            <div className="mt-4 space-y-2 border-t border-slate-200 pt-3">
              {result.items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-xs"
                >
                  <span>
                    <strong>{item.quantity}×</strong> {item.productNameSnapshot}{" "}
                    <span className="text-slate-400">({item.skuSnapshot})</span>
                  </span>
                  <span className="font-bold text-brand-700 tabular-nums">
                    {formatRsd(item.lineTotalRsd)}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-3 flex justify-between border-t border-slate-200 pt-3 text-sm font-extrabold text-brand-700 tabular-nums">
              <span>Ukupno za naplatu:</span>
              <span>{formatRsd(result.totalRsd)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

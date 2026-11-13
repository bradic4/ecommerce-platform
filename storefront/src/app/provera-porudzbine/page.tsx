"use client";

import Link from "next/link";
import React, { useState } from "react";
import { API_BASE_URL, formatRsd } from "@/lib/api";

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
      const data = await res.json();
      if (!res.ok) {
        setError(data?.message || "Porudžbina sa unetim brojem nije pronađena.");
      } else {
        setResult(data);
      }
    } catch {
      setError("Provera trenutno nije dostupna. Pokušajte ponovo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <nav className="mb-4 text-xs text-slate-500">
        <Link href="/" className="hover:text-[#0f807f]">
          Početna
        </Link>{" "}
        / <span className="font-semibold text-slate-800">Status porudžbine</span>
      </nav>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-extrabold text-[#101c32] sm:text-2xl">
          Provera statusa porudžbine (bez registracije)
        </h1>
        <p className="mt-1 text-xs text-slate-600">
          Unesite broj porudžbine koji ste dobili nakon potvrde kupovine (npr.{" "}
          <code>ORD-20261113-123456</code>).
        </p>

        <form onSubmit={handleLookup} className="mt-4 flex flex-wrap gap-2">
          <input
            type="text"
            required
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="ORD-2026..."
            className="flex-1 rounded-md border border-slate-300 px-3.5 py-2 text-sm focus:border-[#0f807f] focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-[#101c32] px-5 py-2 text-sm font-bold text-white hover:bg-[#1d2f52] transition disabled:opacity-50"
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
          <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div>
                <span className="text-xs text-slate-500">Broj porudžbine:</span>
                <div className="text-base font-extrabold text-[#101c32]">
                  {result.orderNumber}
                </div>
              </div>
              <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-bold text-teal-900">
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
                    <strong>{item.quantity}x</strong> {item.productNameSnapshot}{" "}
                    <span className="text-slate-400">({item.skuSnapshot})</span>
                  </span>
                  <span className="font-bold text-slate-800">
                    {formatRsd(item.lineTotalRsd)}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-3 flex justify-between border-t border-slate-200 pt-3 text-sm font-extrabold text-[#101c32]">
              <span>Ukupno za naplatu pouzećem:</span>
              <span>{formatRsd(result.totalRsd)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

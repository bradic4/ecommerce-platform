"use client";

import Link from "next/link";
import React from "react";
import { formatRsd } from "@/lib/api";
import { STORE_CONFIG } from "@/lib/store-config";
import { useCart } from "./CartContext";
import { IconCheck, IconChevronRight, IconClose } from "./Icons";

export function CartDrawer() {
  const {
    items,
    totalQuantity,
    updateQuantity,
    removeItem,
    isDrawerOpen,
    closeDrawer,
  } = useCart();

  if (!isDrawerOpen) return null;

  const estimatedSubtotal = items.reduce(
    (sum, i) => sum + (i.unitPriceRsd || 0) * i.quantity,
    0
  );
  const threshold = STORE_CONFIG.freeShippingThresholdRsd;
  const remainingForFree = Math.max(0, threshold - estimatedSubtotal);
  const progressPct = Math.min(
    100,
    Math.round((estimatedSubtotal / threshold) * 100)
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-xs">
      <div
        className="fixed inset-0"
        onClick={closeDrawer}
        aria-hidden="true"
      />

      <aside className="relative z-10 flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 bg-[#0F172A] px-5 py-4 text-white">
          <div>
            <h2 className="text-base font-extrabold">
              Vaša korpa ({totalQuantity})
            </h2>
            <p className="text-xs text-slate-300">
              Plaćanje pouzećem kuriru ili NBS IPS QR nalogom
            </p>
          </div>
          <button
            type="button"
            onClick={closeDrawer}
            aria-label="Zatvori korpu"
            className="cursor-pointer inline-flex items-center gap-1 rounded-md bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-700"
          >
            <span>Zatvori</span>
            <IconClose className="h-3.5 w-3.5" />
          </button>
        </div>

        {estimatedSubtotal > 0 && (
          <div className="border-b border-emerald-200 bg-emerald-50/70 px-5 py-3 text-xs">
            {remainingForFree === 0 ? (
              <div className="inline-flex items-center gap-1.5 font-bold text-[#064E3B]">
                <IconCheck className="h-4 w-4 text-[#059669]" />
                <span>Ostvarili ste besplatnu isporuku na kućnu adresu!</span>
              </div>
            ) : (
              <div className="text-slate-700">
                Dodajte još{" "}
                <strong className="text-[#0F172A] tabular-nums">
                  {formatRsd(remainingForFree)}
                </strong>{" "}
                do <strong>besplatne dostave</strong>!
              </div>
            )}
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full bg-[#059669] transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5">
          {items.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-slate-600 mb-4">
                Vaša korpa je trenutno prazna.
              </p>
              <button
                type="button"
                onClick={closeDrawer}
                className="cursor-pointer rounded-lg bg-[#0F172A] px-4 py-2 text-xs font-bold text-white"
              >
                Nastavi kupovinu
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-slate-200">
              {items.map((item) => (
                <li key={item.variantId} className="py-3.5 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/proizvod/${item.productSlug}`}
                      onClick={closeDrawer}
                      className="font-bold text-[#0F172A] hover:text-[#059669] text-sm"
                    >
                      {item.productName}
                    </Link>
                    <button
                      type="button"
                      onClick={() => removeItem(item.variantId)}
                      className="cursor-pointer text-slate-500 hover:text-red-600 font-bold"
                    >
                      Ukloni
                    </button>
                  </div>
                  <div className="mt-0.5 font-mono text-[11px] text-slate-500 tabular-nums">
                    SKU: {item.sku}
                  </div>
                  <div className="mt-2.5 flex items-center justify-between">
                    <div className="inline-flex items-center rounded border border-slate-300">
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.variantId, item.quantity - 1)
                        }
                        className="cursor-pointer px-2.5 py-1 font-bold text-slate-700 hover:bg-slate-100"
                      >
                        -
                      </button>
                      <span className="px-3 py-1 font-bold text-slate-900 tabular-nums">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.variantId, item.quantity + 1)
                        }
                        className="cursor-pointer px-2.5 py-1 font-bold text-slate-700 hover:bg-slate-100"
                      >
                        +
                      </button>
                    </div>
                    {item.unitPriceRsd && (
                      <span className="font-extrabold text-[#0F172A] text-sm tabular-nums">
                        {formatRsd(item.unitPriceRsd * item.quantity)}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-slate-200 bg-slate-50 p-5 space-y-3">
            {estimatedSubtotal > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Okvirni međuzbir:</span>
                <span className="text-base font-extrabold text-[#0F172A] tabular-nums">
                  {formatRsd(estimatedSubtotal)}
                </span>
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Link
                href="/checkout"
                onClick={closeDrawer}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#EA580C] px-4 py-3 text-center text-sm font-extrabold text-white shadow-sm hover:bg-[#D97706] transition"
              >
                <span>Pređi na podatke za isporuku</span>
                <IconChevronRight className="h-4 w-4" />
              </Link>
              <button
                type="button"
                onClick={closeDrawer}
                className="cursor-pointer w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Nastavi sa pregledom kataloga
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

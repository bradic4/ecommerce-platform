"use client";

import Link from "next/link";
import React from "react";
import { AddToCartButton } from "@/components/AddToCartButton";
import { useCart } from "@/components/CartContext";
import { formatRsd } from "@/lib/api";

export default function CompareProductsPage() {
  const { compareItems, toggleCompareItem, clearCompare } = useCart();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <nav className="mb-4 text-xs text-slate-500">
        <Link href="/" className="hover:text-brand-700">
          Početna
        </Link>{" "}
        /{" "}
        <span className="font-semibold text-slate-800">
          Uporedni pregled tehničkih specifikacija
        </span>
      </nav>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-brand-700">
            Uporedite tehničke karakteristike i cene ({compareItems.length}/4)
          </h1>
          <p className="text-xs text-slate-600">
            Uporedni prikaz cena, rokova isporuke i tehničkih parametara
            izabranih artikala.
          </p>
        </div>
        {compareItems.length > 0 && (
          <button
            type="button"
            onClick={clearCompare}
            className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            Isprazni listu za poređenje
          </button>
        )}
      </div>

      {compareItems.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xs">
          <p className="text-sm text-slate-600 mb-4">
            Niste dodali nijedan artikal u tabelu za poređenje. Kliknite na dugme{" "}
            <strong>Uporedi</strong> na bilo kojoj kartici proizvoda u katalogu.
          </p>
          <Link
            href="/"
            className="inline-block rounded-lg bg-brand-700 px-5 py-2.5 text-xs font-bold text-white hover:bg-brand-600"
          >
            Pregledaj katalog &rarr;
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
          <table className="w-full min-w-[680px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="w-44 p-4 font-bold text-slate-600">Parametar</th>
                {compareItems.map((item) => (
                  <th key={item.id} className="p-4 align-top">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/proizvod/${item.slug}`}
                        className="text-sm font-extrabold text-brand-700 hover:text-brand-500"
                      >
                        {item.name}
                      </Link>
                      <button
                        type="button"
                        onClick={() => toggleCompareItem(item)}
                        className="cursor-pointer text-slate-400 hover:text-red-600 font-bold"
                        title="Ukloni iz poređenja"
                      >
                        ✕
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr>
                <td className="p-4 font-semibold text-slate-600 bg-slate-50/50">
                  Cena (sa PDV-om)
                </td>
                {compareItems.map((item) => (
                  <td
                    key={item.id}
                    className="p-4 text-base font-extrabold text-brand-700 tabular-nums"
                  >
                    {formatRsd(item.priceRsd)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 font-semibold text-slate-600 bg-slate-50/50">
                  Status i rok isporuke
                </td>
                {compareItems.map((item) => (
                  <td key={item.id} className="p-4">
                    <span className="inline-block rounded-md bg-stock-50 px-2 py-0.5 font-semibold text-stock-700 border border-stock-100">
                      {item.availabilityLabel}
                    </span>
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 font-semibold text-slate-600 bg-slate-50/50">
                  Tehnička specifikacija
                </td>
                {compareItems.map((item) => (
                  <td
                    key={item.id}
                    className="p-4 text-slate-700 leading-relaxed"
                  >
                    {item.shortSpecification || "Standardna specifikacija"}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 font-semibold text-slate-600 bg-slate-50/50">
                  Šifra (SKU) / EAN
                </td>
                {compareItems.map((item) => (
                  <td
                    key={item.id}
                    className="p-4 font-mono text-slate-500 tabular-nums"
                  >
                    <div>SKU: {item.sku || "-"}</div>
                    <div>EAN: {item.ean || "-"}</div>
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 font-semibold text-slate-600 bg-slate-50/50">
                  Kupovina
                </td>
                {compareItems.map((item) => (
                  <td key={item.id} className="p-4">
                    {item.variantId && (
                      <AddToCartButton
                        variantId={item.variantId}
                        productSlug={item.slug}
                        productName={item.name}
                        sku={item.sku || ""}
                        isOrderable={item.isOrderable}
                        fullWidth
                      />
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

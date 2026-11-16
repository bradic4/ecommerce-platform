"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import {
  API_BASE_URL,
  CatalogProductItemDto,
  formatRsd,
} from "@/lib/api";
import { STORE_CONFIG } from "@/lib/store-config";
import { useCart } from "./CartContext";
import { CartDrawer } from "./CartDrawer";
import { IconCart, IconCompare, IconSearch, IconTruck } from "./Icons";

export function Header() {
  const { totalQuantity, compareItems, openDrawer } = useCart();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [suggestions, setSuggestions] = useState<CatalogProductItemDto[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/v1/catalog/products?q=${encodeURIComponent(trimmed)}`
        );
        if (!res.ok) return;
        const data: CatalogProductItemDto[] = await res.json();
        if (!cancelled) {
          setSuggestions(data.slice(0, 5));
        }
      } catch {
        // Ignore network errors during autocomplete
      }
    }, 180);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setShowDropdown(false);
    const trimmed = query.trim();
    if (!trimmed) {
      router.push("/");
    } else {
      router.push(`/?q=${encodeURIComponent(trimmed)}`);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-[#0F172A] text-white shadow-sm">
        <div className="border-b border-slate-800/80 bg-[#090F1D] py-1.5 text-xs text-slate-300">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between px-4 gap-2">
            <span className="inline-flex items-center gap-1.5">
              <IconTruck className="h-3.5 w-3.5 text-emerald-400" />
              <span>
                Besplatna isporuka za porudžbine preko{" "}
                <strong className="text-white tabular-nums">
                  {formatRsd(STORE_CONFIG.freeShippingThresholdRsd)}
                </strong>
              </span>
            </span>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/provera-porudzbine"
                className="hover:text-white underline-offset-2 hover:underline"
              >
                Status porudžbine
              </Link>
              <Link
                href="/reklamacije"
                className="hover:text-white underline-offset-2 hover:underline"
              >
                Reklamacije i odustanak (14 dana)
              </Link>
              <Link
                href="/uslovi-kupovine"
                className="hover:text-white underline-offset-2 hover:underline"
              >
                Uslovi kupovine
              </Link>
            </div>
          </div>
        </div>

        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3.5">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#059669] font-heading text-sm font-extrabold text-white">
              AD
            </span>
            <div>
              <span className="block font-heading text-lg font-extrabold tracking-tight text-white leading-none">
                {STORE_CONFIG.brandName}
              </span>
              <span className="block text-[11px] text-slate-400">
                Alati i oprema sa garancijom
              </span>
            </div>
          </Link>

          <div className="relative flex-1 max-w-md">
            <form onSubmit={handleSearch} className="flex items-center">
              <label htmlFor="site-search" className="sr-only">
                Pretražite katalog (latinica, ćirilica ili SKU)
              </label>
              <input
                id="site-search"
                type="search"
                value={query}
                onFocus={() => setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 180)}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setShowDropdown(true);
                }}
                placeholder="Pretraga (bušilica, busilica, бушилица, SKU)..."
                className="w-full rounded-l-lg border border-slate-700 bg-slate-900/90 px-3.5 py-2 text-sm text-white placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
              />
              <button
                type="submit"
                className="cursor-pointer inline-flex items-center gap-1.5 rounded-r-lg bg-[#059669] px-4 py-2 text-sm font-bold text-white hover:bg-[#047857] transition"
              >
                <IconSearch className="h-4 w-4" />
                <span>Traži</span>
              </button>
            </form>

            {showDropdown && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-900 shadow-xl z-40">
                <div className="bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-600 border-b border-slate-200">
                  Predloženi proizvodi ({suggestions.length})
                </div>
                <ul className="divide-y divide-slate-100">
                  {suggestions.map((s) => (
                    <li key={s.id}>
                      <Link
                        href={`/proizvod/${s.slug}`}
                        className="flex items-center justify-between gap-3 px-3.5 py-2.5 hover:bg-emerald-50/50 transition"
                      >
                        <div>
                          <div className="text-xs font-bold text-[#0F172A]">
                            {s.name}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            <span className="font-mono tabular-nums">{s.sku}</span>{" "}
                            — {s.availabilityLabel}
                          </div>
                        </div>
                        <span className="whitespace-nowrap text-xs font-extrabold text-[#059669] tabular-nums">
                          {formatRsd(s.priceRsd)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <nav className="flex items-center gap-3">
            <Link
              href="/kategorija/aku-i-elektricni-alati"
              className="text-sm font-semibold text-slate-200 hover:text-white"
            >
              Alati
            </Link>
            <Link
              href="/kategorija/oprema-za-kucu-i-dvoriste"
              className="text-sm font-semibold text-slate-200 hover:text-white"
            >
              Kuća i dvorište
            </Link>
            <Link
              href="/vodici"
              className="text-sm font-semibold text-slate-200 hover:text-white"
            >
              Vodiči
            </Link>
            <Link
              href="/uporedi"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/90 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 transition"
            >
              <IconCompare className="h-3.5 w-3.5 text-emerald-400" />
              <span>Uporedi</span>
              <span className="rounded-full bg-slate-700 px-1.5 py-0.5 text-[11px] font-bold text-white tabular-nums">
                {compareItems.length}
              </span>
            </Link>
            <button
              type="button"
              onClick={openDrawer}
              className="cursor-pointer inline-flex items-center gap-2 rounded-lg bg-[#EA580C] px-3.5 py-2 text-sm font-extrabold text-white shadow-xs hover:bg-[#D97706] transition"
            >
              <IconCart className="h-4 w-4" />
              <span>Korpa</span>
              <span className="rounded-full bg-black/25 px-2 py-0.5 text-xs font-bold text-white tabular-nums">
                {totalQuantity}
              </span>
            </button>
          </nav>
        </div>
      </header>
      <CartDrawer />
    </>
  );
}

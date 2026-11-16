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
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-[#101c32] text-white shadow-sm">
        <div className="bg-[#0b1424] py-1.5 text-xs text-slate-300">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between px-4 gap-2">
            <span>
              Besplatna isporuka za porudžbine preko{" "}
              <strong>{formatRsd(STORE_CONFIG.freeShippingThresholdRsd)}</strong> • Plaćanje pouzećem ili NBS IPS QR
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
            <span className="rounded bg-[#0f807f] px-2.5 py-1 text-xs font-bold tracking-wider uppercase">
              {STORE_CONFIG.badgeLabel}
            </span>
            <span className="text-lg font-extrabold tracking-tight text-white">
              {STORE_CONFIG.brandName}
            </span>
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
                placeholder="Pretraga (npr. bušilica, busilica, бушилица, SKU)..."
                className="w-full rounded-l-md border border-slate-600 bg-slate-800/90 px-3.5 py-2 text-sm text-white placeholder-slate-400 focus:border-teal-400 focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-r-md bg-[#0f807f] px-4 py-2 text-sm font-semibold text-white hover:bg-teal-600 transition"
              >
                Traži
              </button>
            </form>

            {showDropdown && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 overflow-hidden rounded-lg border border-slate-200 bg-white text-slate-900 shadow-xl z-40">
                <div className="bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-500 border-b border-slate-200">
                  Brzi rezultati pretrage ({suggestions.length})
                </div>
                <ul className="divide-y divide-slate-100">
                  {suggestions.map((s) => (
                    <li key={s.id}>
                      <Link
                        href={`/proizvod/${s.slug}`}
                        className="flex items-center justify-between gap-3 px-3.5 py-2.5 hover:bg-slate-50 transition"
                      >
                        <div>
                          <div className="text-xs font-bold text-[#101c32]">
                            {s.name}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            SKU: {s.sku} • {s.availabilityLabel}
                          </div>
                        </div>
                        <span className="whitespace-nowrap text-xs font-extrabold text-[#0f807f]">
                          {formatRsd(s.priceRsd)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <nav className="flex items-center gap-3.5">
            <Link
              href="/kategorija/aku-i-elektricni-alati"
              className="text-sm font-medium text-slate-200 hover:text-white"
            >
              Alati
            </Link>
            <Link
              href="/kategorija/oprema-za-kucu-i-dvoriste"
              className="text-sm font-medium text-slate-200 hover:text-white"
            >
              Kuća i dvorište
            </Link>
            <Link
              href="/vodici"
              className="text-sm font-medium text-slate-200 hover:text-white"
            >
              Vodiči
            </Link>
            <Link
              href="/uporedi"
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
            >
              <span>Uporedi</span>
              <span className="rounded-full bg-slate-600 px-1.5 py-0.5 text-[11px] font-bold text-white">
                {compareItems.length}
              </span>
            </Link>
            <button
              type="button"
              onClick={openDrawer}
              className="inline-flex items-center gap-2 rounded-md bg-white px-3.5 py-2 text-sm font-bold text-[#101c32] shadow-sm hover:bg-slate-100 transition"
            >
              <span>Korpa</span>
              <span className="rounded-full bg-[#0f807f] px-2 py-0.5 text-xs font-bold text-white">
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

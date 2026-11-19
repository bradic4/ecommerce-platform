"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import {
  API_BASE_URL,
  CatalogProductItemDto,
  CategoryDto,
  formatRsd,
} from "@/lib/api";
import { STORE_CONFIG } from "@/lib/store-config";
import {
  getFallbackCatalogProducts,
  getFallbackCategories,
} from "@/lib/training-store";
import { useCart } from "./CartContext";
import { CartDrawer } from "./CartDrawer";
import { IconCart, IconCompare, IconSearch, IconTruck } from "./Icons";
import { Logo } from "./Logo";

export function Header() {
  const { totalQuantity, compareItems, openDrawer } = useCart();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [suggestions, setSuggestions] = useState<CatalogProductItemDto[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/catalog/categories`);
        if (res.ok) {
          const data: CategoryDto[] = await res.json();
          if (!cancelled && data.length > 0) {
            setCategories(data.slice(0, 3));
            return;
          }
        }
      } catch {
        // Fallback to training store
      }
      if (!cancelled) {
        setCategories(getFallbackCategories().slice(0, 3));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
        if (res.ok) {
          const data: CatalogProductItemDto[] = await res.json();
          if (!cancelled) {
            setSuggestions(data.slice(0, 5));
            return;
          }
        }
      } catch {
        // Fallback to local training catalog search
      }
      if (!cancelled) {
        setSuggestions(getFallbackCatalogProducts({ q: trimmed }).slice(0, 5));
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
      <header className="sticky top-0 z-30 border-b border-brand-800 bg-brand-700 text-white shadow-sm">
        <div className="border-b border-brand-800/80 bg-brand-800 py-1.5 text-xs text-slate-300">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between px-4 gap-2">
            <span className="inline-flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-accent-400/15 px-2 py-0.5 text-[11px] font-bold text-accent-400 ring-1 ring-accent-400/30">
                <span className="h-1.5 w-1.5 rounded-full bg-accent-400" />
                Live status lagera
              </span>
              <span className="inline-flex items-center gap-1.5">
                <IconTruck className="h-3.5 w-3.5 text-accent-400" />
                <span>
                  Besplatna isporuka preko{" "}
                  <strong className="text-white tabular-nums">
                    {formatRsd(STORE_CONFIG.freeShippingThresholdRsd)}
                  </strong>
                </span>
              </span>
            </span>
            <div className="flex flex-wrap items-center gap-4">
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
                Reklamacije i odustanak (14d)
              </Link>
              <Link
                href="/uslovi-kupovine"
                className="hover:text-white underline-offset-2 hover:underline"
              >
                Uslovi kupovine
              </Link>
              <Link
                href="/admin"
                className="inline-flex items-center gap-1.5 rounded-md bg-accent-400 px-2.5 py-0.5 text-[11px] font-extrabold text-brand-800 hover:bg-accent-300 transition"
              >
                <span>Operativni Admin</span>
              </Link>
            </div>
          </div>
        </div>

        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3.5">
          <Link href="/" className="flex items-center">
            <Logo tone="light" size="md" showTagline />
          </Link>

          <div className="relative flex-1 max-w-md">
            <form onSubmit={handleSearch} className="flex items-center">
              <label htmlFor="site-search" className="sr-only">
                Pretražite katalog (latinica, ćirilica, EAN ili SKU)
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
                placeholder="Pretraga (GaN 65W, tastatura, bušilica, SKU)..."
                className="w-full rounded-l-lg border border-brand-600 bg-brand-800/90 px-3.5 py-2 text-sm text-white placeholder-slate-400 focus:border-accent-400 focus:outline-none"
              />
              <button
                type="submit"
                className="cursor-pointer inline-flex items-center gap-1.5 rounded-r-lg bg-accent-400 px-4 py-2 text-sm font-extrabold text-brand-800 hover:bg-accent-300 transition"
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
                        className="flex items-center justify-between gap-3 px-3.5 py-2.5 hover:bg-brand-50/70 transition"
                      >
                        <div>
                          <div className="text-xs font-bold text-brand-700">
                            {s.name}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            <span className="font-mono tabular-nums">
                              {s.sku}
                            </span>{" "}
                            — {s.availabilityLabel}
                          </div>
                        </div>
                        <span className="whitespace-nowrap text-xs font-extrabold text-brand-700 tabular-nums">
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
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/kategorija/${cat.slug}`}
                className="hidden md:inline-block text-xs font-semibold text-slate-200 hover:text-accent-400 transition"
              >
                {cat.name}
              </Link>
            ))}
            <Link
              href="/vodici"
              className="text-xs font-semibold text-slate-200 hover:text-accent-400 transition"
            >
              Vodiči
            </Link>
            <Link
              href="/uporedi"
              className="inline-flex items-center gap-1.5 rounded-lg border border-brand-600 bg-brand-800/80 px-3 py-2 text-xs font-bold text-slate-100 hover:border-brand-500 hover:bg-brand-800 transition"
            >
              <IconCompare className="h-3.5 w-3.5 text-accent-400" />
              <span>Uporedi</span>
              <span className="rounded-full bg-brand-600 px-1.5 py-0.5 text-[11px] font-bold text-white tabular-nums">
                {compareItems.length}
              </span>
            </Link>
            <button
              type="button"
              onClick={openDrawer}
              className="cursor-pointer inline-flex items-center gap-2 rounded-lg bg-accent-400 px-3.5 py-2 text-sm font-extrabold text-brand-800 shadow-xs hover:bg-accent-300 transition"
            >
              <IconCart className="h-4 w-4" />
              <span>Korpa</span>
              <span className="rounded-full bg-brand-700 px-2 py-0.5 text-xs font-bold text-accent-400 tabular-nums">
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

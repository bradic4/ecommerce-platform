"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useState } from "react";
import { useCart } from "./CartContext";

export function Header() {
  const { totalQuantity, compareItems } = useCart();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      router.push("/");
    } else {
      router.push(`/?q=${encodeURIComponent(trimmed)}`);
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-[#101c32] text-white shadow-sm">
      <div className="bg-[#0b1424] py-1.5 text-xs text-slate-300">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between px-4">
          <span>
            Besplatna isporuka za porudžbine preko <strong>12.000 RSD</strong> • Plaćanje pouzećem pri preuzimanju
          </span>
          <div className="flex gap-4">
            <Link href="/provera-porudzbine" className="hover:text-white underline-offset-2 hover:underline">
              Status porudžbine
            </Link>
            <Link href="/reklamacije" className="hover:text-white underline-offset-2 hover:underline">
              Reklamacije i odustanak (14 dana)
            </Link>
            <Link href="/uslovi-kupovine" className="hover:text-white underline-offset-2 hover:underline">
              Uslovi kupovine
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3.5">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="rounded bg-[#0f807f] px-2.5 py-1 text-xs font-bold tracking-wider uppercase">
            PRODAVNICA
          </span>
          <span className="text-lg font-extrabold tracking-tight text-white">
            Alati &amp; Domaćinstvo
          </span>
        </Link>

        <form onSubmit={handleSearch} className="flex flex-1 max-w-md items-center">
          <label htmlFor="site-search" className="sr-only">
            Pretražite katalog (latinica, ćirilica ili SKU)
          </label>
          <input
            id="site-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
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

        <nav className="flex items-center gap-4">
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
          <Link
            href="/checkout"
            className="inline-flex items-center gap-2 rounded-md bg-white px-3.5 py-2 text-sm font-bold text-[#101c32] shadow-sm hover:bg-slate-100 transition"
          >
            <span>Korpa</span>
            <span className="rounded-full bg-[#0f807f] px-2 py-0.5 text-xs font-bold text-white">
              {totalQuantity}
            </span>
          </Link>
        </nav>
      </div>
    </header>
  );
}

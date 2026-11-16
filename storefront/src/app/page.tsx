import Link from "next/link";
import React from "react";
import { ProductCard } from "@/components/ProductCard";
import { fetchCatalogProducts, fetchCategories } from "@/lib/api";
import { STATIC_BUYING_GUIDES } from "@/lib/guides";
import { STORE_CONFIG } from "@/lib/store-config";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string; inStock?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim();
  const sort = params.sort;
  const inStockOnly = params.inStock === "1";

  const [categories, products] = await Promise.all([
    fetchCategories(),
    fetchCatalogProducts({ q, sort, inStockOnly }),
  ]);

  const ownStockSpotlight = !q
    ? products.filter((p) => p.ownStockAvailable).slice(0, 3)
    : [];

  return (
    <div className="space-y-10">
      {/* Hero / Value Proposition (Section 04.2) */}
      {!q && (
        <section className="rounded-2xl bg-gradient-to-r from-[#101c32] via-[#162744] to-[#1e3a5f] p-7 sm:p-9 text-white shadow-md">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-block rounded bg-[#0f807f] px-2.5 py-1 text-xs font-bold uppercase tracking-wider">
              {STORE_CONFIG.badgeLabel} • Bez Skrivenih Troškova
            </span>
            <span className="rounded bg-white/10 px-2.5 py-1 text-xs font-semibold text-teal-200">
              Promo kod za prvu kupovinu: DOBRODOSLI10 (-10%)
            </span>
          </div>

          <h1 className="mt-3 text-2xl font-extrabold md:text-4xl leading-tight">
            {STORE_CONFIG.brandTagline}
          </h1>
          <p className="mt-2.5 max-w-2xl text-sm text-slate-200 leading-relaxed">
            Svaki proizvod na sajtu ima jasno prikazan izvor i tačan rok isporuke. Naručujete bez obavezne registracije,
            a plaćate kuriru pouzećem pri preuzimanju pošiljke ili instant NBS IPS QR nalogom.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/kategorija/${c.slug}`}
                className="rounded-lg bg-white px-4 py-2.5 text-xs font-extrabold text-[#101c32] shadow-xs hover:bg-slate-100 transition"
              >
                {c.name} ({c.productCount}) &rarr;
              </Link>
            ))}
            <Link
              href="/vodici"
              className="rounded-lg border border-white/30 bg-white/10 px-4 py-2.5 text-xs font-bold text-white hover:bg-white/20 transition"
            >
              Stručni vodiči za kupovinu
            </Link>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-white/15 pt-4 text-xs text-slate-300">
            <span className="font-semibold text-white">Popularne pretrage:</span>
            {STORE_CONFIG.quickSearchSuggestions.map((tag) => (
              <Link
                key={tag}
                href={`/?q=${encodeURIComponent(tag)}`}
                className="rounded-full bg-slate-800/80 px-3 py-1 text-[11px] text-slate-200 hover:bg-[#0f807f] hover:text-white transition"
              >
                {tag}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Spotlight: Odmah u našem magacinu (Isporuka 24-48h) */}
      {!q && ownStockSpotlight.length > 0 && (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="inline-block rounded bg-emerald-700 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                Odmah na stanju (Naš magacin)
              </span>
              <h2 className="mt-1 text-lg font-extrabold text-[#101c32]">
                Ekspresna isporuka za 1–2 radna dana
              </h2>
            </div>
            <Link
              href="/?inStock=1"
              className="text-xs font-bold text-emerald-800 hover:underline"
            >
              Prikaži sve dostupne artikle &rarr;
            </Link>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {ownStockSpotlight.map((product) => (
              <ProductCard key={`spot-${product.id}`} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* Search & Filter Bar */}
      <section className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-[#101c32]">
            {q ? `Rezultati pretrage za: „${q}“` : "Kompletan katalog proizvoda"}
          </h2>
          <p className="text-xs text-slate-500">
            Prikazano {products.length} artikala • Pretraga podržava latinicu, ćirilicu i upite bez kvačica
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Link
            href={`/?${new URLSearchParams({
              ...(q ? { q } : {}),
              ...(inStockOnly ? {} : { inStock: "1" }),
              ...(sort ? { sort } : {}),
            }).toString()}`}
            className={`rounded-md border px-3 py-1.5 font-semibold ${
              inStockOnly
                ? "border-teal-600 bg-teal-50 text-teal-800"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            Samo dostupno
          </Link>
          <Link
            href={`/?${new URLSearchParams({
              ...(q ? { q } : {}),
              ...(inStockOnly ? { inStock: "1" } : {}),
              sort: "price_asc",
            }).toString()}`}
            className={`rounded-md border px-3 py-1.5 font-semibold ${
              sort === "price_asc"
                ? "border-[#101c32] bg-[#101c32] text-white"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            Cena: niža ka višoj
          </Link>
          <Link
            href={`/?${new URLSearchParams({
              ...(q ? { q } : {}),
              ...(inStockOnly ? { inStock: "1" } : {}),
              sort: "price_desc",
            }).toString()}`}
            className={`rounded-md border px-3 py-1.5 font-semibold ${
              sort === "price_desc"
                ? "border-[#101c32] bg-[#101c32] text-white"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            Cena: viša ka nižoj
          </Link>
        </div>
      </section>

      {products.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
          <p className="text-base font-semibold text-slate-700">
            Nismo pronašli proizvode koji odgovaraju vašem upitu.
          </p>
          <Link
            href="/"
            className="mt-3 inline-block rounded-md bg-[#101c32] px-4 py-2 text-xs font-bold text-white"
          >
            Prikaži ceo katalog
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {/* Buying Guides Preview Section for Organic SEO Authority */}
      {!q && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#0f807f]">
                Vodiči za kupovinu i saveti majstora
              </span>
              <h2 className="text-lg font-extrabold text-[#101c32]">
                Kako da odaberete pravi alat bez preplaćivanja
              </h2>
            </div>
            <Link
              href="/vodici"
              className="text-xs font-bold text-[#101c32] hover:text-[#0f807f]"
            >
              Svi vodiči ({STATIC_BUYING_GUIDES.length}) &rarr;
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {STATIC_BUYING_GUIDES.map((g) => (
              <Link
                key={g.slug}
                href={`/vodici/${g.slug}`}
                className="group rounded-lg border border-slate-200 bg-slate-50/60 p-4 hover:border-[#0f807f] hover:bg-white transition"
              >
                <span className="text-[11px] font-semibold text-[#0f807f]">
                  {g.categoryName} • {g.readingTimeMinutes} min
                </span>
                <h3 className="mt-1 text-sm font-bold text-[#101c32] group-hover:text-[#0f807f] leading-snug">
                  {g.title}
                </h3>
                <p className="mt-1.5 text-xs text-slate-600 line-clamp-2">
                  {g.excerpt}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

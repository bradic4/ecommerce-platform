import Link from "next/link";
import React from "react";
import { ProductCard } from "@/components/ProductCard";
import { fetchCatalogProducts, fetchCategories } from "@/lib/api";

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

  return (
    <div className="space-y-8">
      {/* Hero / Value Proposition (Section 04.2) */}
      {!q && (
        <section className="rounded-xl bg-gradient-to-r from-[#101c32] to-[#1e3a5f] p-7 text-white shadow-sm">
          <span className="inline-block rounded bg-[#0f807f] px-2.5 py-1 text-xs font-bold uppercase tracking-wider">
            Proveren Katalog • Bez Skrivenih Troškova
          </span>
          <h1 className="mt-3 text-2xl font-extrabold md:text-3xl">
            Alati i oprema za radionicu, kuću i dvorište
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-200 leading-relaxed">
            Svaki proizvod na sajtu ima jasno prikazan izvor i rok isporuke. Naručujete bez obavezne registracije,
            a plaćate kuriru pouzećem pri preuzimanju pošiljke.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/kategorija/${c.slug}`}
                className="rounded-md bg-white/10 px-4 py-2 text-xs font-semibold text-white backdrop-blur hover:bg-white/20 transition"
              >
                {c.name} ({c.productCount})
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Search & Filter Bar */}
      <section className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-[#101c32]">
            {q ? `Rezultati pretrage za: „${q}“` : "Aktuelna ponuda proizvoda"}
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
    </div>
  );
}

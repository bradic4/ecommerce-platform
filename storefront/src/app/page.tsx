import Link from "next/link";
import React from "react";
import { IconCheck, IconChevronRight, IconTruck } from "@/components/Icons";
import { ProductCard } from "@/components/ProductCard";
import { ProductVisual } from "@/components/ProductVisual";
import { fetchCatalogProducts, fetchCategories, formatRsd } from "@/lib/api";
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

  const featuredHeroProduct = products[0];

  return (
    <div className="space-y-12">
      {/* First Viewport: Asymmetric Workbench Showcase (Impeccable Persuade Mode) */}
      {!q && (
        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-[#0F172A] text-white shadow-lg">
          <div className="grid items-center gap-8 p-6 sm:p-9 lg:grid-cols-12">
            <div className="space-y-5 lg:col-span-7">
              <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl lg:text-[2.65rem]">
                {STORE_CONFIG.brandTagline}
              </h1>
              <p className="max-w-xl text-sm text-slate-300 leading-relaxed sm:text-base">
                Svaki uređaj u ponudi prikazuje stvarno stanje u našem magacinu ili na lageru dobavljača. Poručite bez kreiranja naloga, uz plaćanje kuriru pri preuzimanju ili instant NBS IPS QR kodom.
              </p>

              <div className="flex flex-wrap gap-3 pt-1">
                {categories.map((c) => (
                  <Link
                    key={c.id}
                    href={`/kategorija/${c.slug}`}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#EA580C] px-5 py-3 text-xs font-extrabold text-white shadow-sm hover:bg-[#D97706] transition"
                  >
                    <span>
                      {c.name} ({c.productCount})
                    </span>
                    <IconChevronRight className="h-4 w-4" />
                  </Link>
                ))}
                <Link
                  href="/vodici"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/90 px-4 py-3 text-xs font-bold text-slate-100 hover:bg-slate-700 transition"
                >
                  <span>Tehnički vodiči za izbor alata</span>
                </Link>
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-slate-800 pt-4 text-xs text-slate-300">
                <span className="font-semibold text-white">Brza pretraga:</span>
                {STORE_CONFIG.quickSearchSuggestions.map((tag) => (
                  <Link
                    key={tag}
                    href={`/?q=${encodeURIComponent(tag)}`}
                    className="rounded-lg bg-slate-800 px-3 py-1 text-xs text-slate-200 hover:bg-[#059669] hover:text-white transition"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            </div>

            {featuredHeroProduct && (
              <div className="rounded-2xl border border-slate-700/80 bg-slate-900/90 p-5 lg:col-span-5">
                <div className="mb-3 flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-1.5 font-bold text-emerald-400">
                    <IconCheck className="h-4 w-4" />
                    <span>Izdvojeno iz našeg magacina</span>
                  </span>
                  <span className="rounded bg-emerald-950 px-2.5 py-0.5 font-mono text-[11px] font-bold text-emerald-300 border border-emerald-800">
                    Kupon: DOBRODOSLI10 (-10%)
                  </span>
                </div>

                <Link
                  href={`/proizvod/${featuredHeroProduct.slug}`}
                  className="block"
                >
                  <ProductVisual
                    slug={featuredHeroProduct.slug}
                    name={featuredHeroProduct.name}
                    sku={featuredHeroProduct.sku}
                    brandName={featuredHeroProduct.brandName}
                    ownStockAvailable={featuredHeroProduct.ownStockAvailable}
                    size="card"
                  />
                </Link>

                <div className="mt-4 flex items-end justify-between gap-3">
                  <div>
                    <Link
                      href={`/proizvod/${featuredHeroProduct.slug}`}
                      className="text-base font-bold text-white hover:text-emerald-400 transition"
                    >
                      {featuredHeroProduct.name}
                    </Link>
                    <div className="mt-1 text-xl font-extrabold text-emerald-400 tabular-nums">
                      {formatRsd(featuredHeroProduct.priceRsd)}
                    </div>
                  </div>
                  <Link
                    href={`/proizvod/${featuredHeroProduct.slug}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-2.5 text-xs font-extrabold text-[#0F172A] hover:bg-slate-100 transition"
                  >
                    <span>Detaljnije</span>
                    <IconChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Spotlight: Odmah u našem magacinu (Isporuka 24-48h) */}
      {!q && ownStockSpotlight.length > 0 && (
        <section className="rounded-2xl border border-emerald-200/90 bg-emerald-50/40 p-6 sm:p-7">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#059669] text-white">
                <IconTruck className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-xl font-extrabold text-[#0F172A]">
                  Spremno za slanje danas iz našeg magacina (isporuka 1 do 2 radna dana)
                </h2>
                <p className="text-xs text-slate-600">
                  Artikli koji se fizički nalaze na našem stanju u Beogradu i odmah su spremni za pakovanje.
                </p>
              </div>
            </div>
            <Link
              href="/?inStock=1"
              className="inline-flex items-center gap-1 text-xs font-bold text-[#064E3B] hover:underline"
            >
              <span>Prikaži sve dostupne artikle</span>
              <IconChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {ownStockSpotlight.map((product) => (
              <ProductCard key={`spot-${product.id}`} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* Main Catalog Header & Filters */}
      <section className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-extrabold text-[#0F172A]">
            {q ? `Rezultati pretrage za: „${q}“` : "Kompletan katalog alata i opreme"}
          </h2>
          <p className="text-xs text-slate-500">
            Prikazano {products.length} artikala. Pretraga prepoznaje latinicu, ćirilicu i upite bez kvačica.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Link
            href={`/?${new URLSearchParams({
              ...(q ? { q } : {}),
              ...(inStockOnly ? {} : { inStock: "1" }),
              ...(sort ? { sort } : {}),
            }).toString()}`}
            className={`rounded-lg border px-3.5 py-2 font-bold transition ${
              inStockOnly
                ? "border-[#059669] bg-emerald-50 text-[#064E3B]"
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
            className={`rounded-lg border px-3.5 py-2 font-bold transition ${
              sort === "price_asc"
                ? "border-[#0F172A] bg-[#0F172A] text-white"
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
            className={`rounded-lg border px-3.5 py-2 font-bold transition ${
              sort === "price_desc"
                ? "border-[#0F172A] bg-[#0F172A] text-white"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            Cena: viša ka nižoj
          </Link>
        </div>
      </section>

      {products.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <p className="text-base font-bold text-slate-800">
            Nismo pronašli uređaje koji odgovaraju traženom pojmu.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Pokušajte sa kraćim nazivom alata (npr. bušilica, brusilica, varenje) ili pregledajte ceo katalog.
          </p>
          <Link
            href="/"
            className="mt-4 inline-block rounded-lg bg-[#0F172A] px-5 py-2.5 text-xs font-bold text-white"
          >
            Prikaži ceo katalog
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {/* Buying Guides Preview Section for Organic SEO Authority */}
      {!q && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-xl font-extrabold text-[#0F172A]">
                Vodiči za kupovinu i poređenje tehničkih karakteristika
              </h2>
              <p className="text-xs text-slate-600">
                Praktični saveti kako da izaberete odgovarajući obrtni moment (Nm), jačinu struje varenja (A) ili pritisak pumpe (bar).
              </p>
            </div>
            <Link
              href="/vodici"
              className="inline-flex items-center gap-1 text-xs font-bold text-[#059669] hover:underline"
            >
              <span>Svi vodiči ({STATIC_BUYING_GUIDES.length})</span>
              <IconChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {STATIC_BUYING_GUIDES.map((g) => (
              <Link
                key={g.slug}
                href={`/vodici/${g.slug}`}
                className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-5 hover:border-[#059669] hover:bg-white transition"
              >
                <div>
                  <div className="flex items-center justify-between text-[11px] font-semibold text-[#059669]">
                    <span>{g.categoryName}</span>
                    <span>{g.readingTimeMinutes} min čitanja</span>
                  </div>
                  <h3 className="mt-2 text-base font-bold text-[#0F172A] group-hover:text-[#059669] leading-snug">
                    {g.title}
                  </h3>
                  <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                    {g.excerpt}
                  </p>
                </div>
                <div className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#0F172A] group-hover:text-[#059669]">
                  <span>Pročitaj vodič</span>
                  <IconChevronRight className="h-3.5 w-3.5" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

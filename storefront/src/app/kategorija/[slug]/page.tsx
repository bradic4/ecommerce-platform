import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import React from "react";
import { ProductCard } from "@/components/ProductCard";
import {
  fetchCatalogProducts,
  fetchCategories,
  SITE_URL,
} from "@/lib/api";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string; inStock?: string; maxPrice?: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const sp = await searchParams;
  const categories = await fetchCategories();
  const category = categories.find((c) => c.slug === slug);

  if (!category) {
    return { title: "Kategorija nije pronađena" };
  }

  const hasFilterParams = Boolean(sp.sort || sp.inStock || sp.maxPrice);

  return {
    title: category.seoTitle || category.name,
    description:
      category.seoDescription ||
      `Pregledajte ponudu u kategoriji ${category.name} uz jasan status lagera i brzu dostavu.`,
    alternates: {
      canonical: `${SITE_URL}/kategorija/${category.slug}`,
    },
    robots: hasFilterParams
      ? { index: false, follow: true }
      : { index: true, follow: true },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string; inStock?: string; maxPrice?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const categories = await fetchCategories();
  const category = categories.find((c) => c.slug === slug);

  if (!category) {
    notFound();
  }

  const products = await fetchCatalogProducts({
    category: slug,
    sort: sp.sort,
    inStockOnly: sp.inStock === "1",
    maxPrice: sp.maxPrice ? Number(sp.maxPrice) : undefined,
  });

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: category.name,
    numberOfItems: products.length,
    itemListElement: products.map((p, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      url: `${SITE_URL}/proizvod/${p.slug}`,
      name: p.name,
    })),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Početna",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: category.name,
        item: `${SITE_URL}/kategorija/${category.slug}`,
      },
    ],
  };

  return (
    <div className="space-y-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />

      <nav aria-label="Breadcrumb" className="text-xs text-slate-500">
        <Link href="/" className="hover:text-brand-700 hover:underline">
          Početna
        </Link>{" "}
        / <span className="font-semibold text-slate-800">{category.name}</span>
      </nav>

      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <h1 className="text-2xl font-extrabold text-brand-700">
          {category.name}
        </h1>
        {category.introText && (
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            {category.introText}
          </p>
        )}
      </header>

      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-3 text-xs">
        <span className="font-semibold text-slate-700">
          Prikazano artikala: {products.length}
        </span>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/kategorija/${slug}`}
            className={`rounded-lg border px-3 py-1.5 font-semibold ${
              !sp.sort && !sp.maxPrice && !sp.inStock
                ? "border-brand-700 bg-brand-700 text-white"
                : "border-slate-300 bg-white text-slate-700"
            }`}
          >
            Svi artikli
          </Link>
          <Link
            href={`/kategorija/${slug}?inStock=1`}
            rel="nofollow"
            className={`rounded-lg border px-3 py-1.5 font-semibold ${
              sp.inStock === "1"
                ? "border-brand-700 bg-brand-50 text-brand-700"
                : "border-slate-300 bg-white text-slate-700"
            }`}
          >
            Samo dostupno
          </Link>
          <Link
            href={`/kategorija/${slug}?maxPrice=6000`}
            rel="nofollow"
            className={`rounded-lg border px-3 py-1.5 font-semibold ${
              sp.maxPrice === "6000"
                ? "border-brand-700 bg-brand-50 text-brand-700"
                : "border-slate-300 bg-white text-slate-700"
            }`}
          >
            Do 6.000 RSD
          </Link>
          <Link
            href={`/kategorija/${slug}?sort=price_asc`}
            rel="nofollow"
            className={`rounded-lg border px-3 py-1.5 font-semibold ${
              sp.sort === "price_asc"
                ? "border-brand-700 bg-brand-700 text-white"
                : "border-slate-300 bg-white text-slate-700"
            }`}
          >
            Najniža cena
          </Link>
          <Link
            href={`/kategorija/${slug}?sort=price_desc`}
            rel="nofollow"
            className={`rounded-lg border px-3 py-1.5 font-semibold ${
              sp.sort === "price_desc"
                ? "border-brand-700 bg-brand-700 text-white"
                : "border-slate-300 bg-white text-slate-700"
            }`}
          >
            Najviša cena
          </Link>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}

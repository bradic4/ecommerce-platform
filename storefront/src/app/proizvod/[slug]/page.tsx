import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import React from "react";
import { AddToCartButton } from "@/components/AddToCartButton";
import { ProductReviewsSection } from "@/components/ProductReviewsSection";
import { fetchProductBySlug, formatRsd, SITE_URL } from "@/lib/api";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await fetchProductBySlug(slug);

  if (!product) {
    return { title: "Proizvod nije pronađen" };
  }

  return {
    title: product.seoTitle || product.name,
    description:
      product.seoDescription ||
      product.shortSpecification ||
      product.description,
    alternates: {
      canonical: `${SITE_URL}/proizvod/${product.slug}`,
    },
    openGraph: {
      title: product.seoTitle || product.name,
      description: product.seoDescription || product.shortSpecification || "",
      url: `${SITE_URL}/proizvod/${product.slug}`,
      type: "website",
    },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await fetchProductBySlug(slug);

  if (!product || product.variants.length === 0) {
    notFound();
  }

  const primaryVariant = product.variants[0];

  // Section 14.2 & 25.6: Product + Offer + AggregateRating JSON-LD always matches the exact server-rendered state
  const productJsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: primaryVariant.internalSku,
    gtin13: primaryVariant.gtinEan || product.gtinEan || undefined,
    description: product.description || product.shortSpecification,
    offers: {
      "@type": "Offer",
      url: `${SITE_URL}/proizvod/${product.slug}`,
      priceCurrency: "RSD",
      price: primaryVariant.priceRsd.toFixed(2),
      availability: primaryVariant.schemaAvailability,
      itemCondition: "https://schema.org/NewCondition",
    },
  };

  if (product.aggregateRating && product.aggregateRating.reviewCount > 0) {
    productJsonLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: product.aggregateRating.ratingValue,
      reviewCount: product.aggregateRating.reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }

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
      ...(product.category
        ? [
            {
              "@type": "ListItem",
              position: 2,
              name: product.category.name,
              item: `${SITE_URL}/kategorija/${product.category.slug}`,
            },
          ]
        : []),
      {
        "@type": "ListItem",
        position: product.category ? 3 : 2,
        name: product.name,
        item: `${SITE_URL}/proizvod/${product.slug}`,
      },
    ],
  };

  return (
    <div className="space-y-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <nav aria-label="Breadcrumb" className="text-xs text-slate-500">
        <Link href="/" className="hover:text-[#101c32] hover:underline">
          Početna
        </Link>
        {product.category && (
          <>
            {" "}
            /{" "}
            <Link
              href={`/kategorija/${product.category.slug}`}
              className="hover:text-[#101c32] hover:underline"
            >
              {product.category.name}
            </Link>
          </>
        )}{" "}
        / <span className="font-semibold text-slate-800">{product.name}</span>
      </nav>

      <div className="grid gap-8 rounded-xl border border-slate-200 bg-white p-6 shadow-xs md:grid-cols-12">
        {/* Visual / Technical Spec Highlight Box */}
        <div className="flex flex-col justify-between rounded-lg bg-slate-50 p-6 border border-slate-200 md:col-span-5">
          <div>
            <span className="inline-block rounded bg-[#101c32] px-2.5 py-1 text-[11px] font-bold text-white uppercase">
              Kanonski Identitet Artikla
            </span>
            <h2 className="mt-4 text-lg font-bold text-slate-800">
              {product.name}
            </h2>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              {product.shortSpecification}
            </p>
          </div>

          <dl className="mt-6 space-y-2 border-t border-slate-200 pt-4 text-xs">
            <div className="flex justify-between">
              <dt className="text-slate-500">Interna šifra (SKU):</dt>
              <dd className="font-mono font-bold text-slate-800">
                {primaryVariant.internalSku}
              </dd>
            </div>
            {primaryVariant.gtinEan && (
              <div className="flex justify-between">
                <dt className="text-slate-500">EAN / GTIN:</dt>
                <dd className="font-mono text-slate-800">
                  {primaryVariant.gtinEan}
                </dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-slate-500">Garancija / Saobraznost:</dt>
              <dd className="font-semibold text-slate-800">24 meseca uz račun</dd>
            </div>
          </dl>
        </div>

        {/* Main Offer & Purchase Info */}
        <div className="flex flex-col justify-between md:col-span-7">
          <div>
            <h1 className="text-2xl font-extrabold text-[#101c32] md:text-3xl">
              {product.name}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span
                className={`rounded-md px-3 py-1 text-xs font-bold ${
                  primaryVariant.ownStockAvailable
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : primaryVariant.isOrderable
                    ? "bg-blue-50 text-blue-800 border border-blue-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {primaryVariant.publicStatusLabel}
              </span>
              <span className="text-xs text-slate-500">
                Varijanta: <strong>{primaryVariant.title}</strong>
              </span>
            </div>

            <div className="mt-6 rounded-lg bg-slate-50 p-4 border border-slate-200">
              <span className="block text-xs text-slate-500">
                Konačna cena sa PDV-om:
              </span>
              <div className="mt-1 text-3xl font-extrabold text-[#101c32]">
                {formatRsd(primaryVariant.priceRsd)}
              </div>
              <p className="mt-1 text-xs text-slate-600">
                Isporuka kurirskom službom: <strong>490 RSD</strong> (besplatna za porudžbine preko 12.000 RSD).
              </p>
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-bold text-[#101c32]">
                Opis i proverene tehničke karakteristike
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
                {product.description}
              </p>

              {product.shortSpecification && (
                <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <tbody className="divide-y divide-slate-200">
                      {product.shortSpecification
                        .split("|")
                        .map((part) => part.trim())
                        .filter(Boolean)
                        .map((spec, idx) => {
                          const [k, v] = spec.includes(":")
                            ? spec.split(":", 2)
                            : [`Parametar ${idx + 1}`, spec];
                          return (
                            <tr key={idx} className="odd:bg-slate-50/70">
                              <th className="w-2/5 px-3 py-2 font-semibold text-slate-600">
                                {k.trim()}
                              </th>
                              <td className="px-3 py-2 font-bold text-[#101c32]">
                                {v.trim()}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 space-y-4 border-t border-slate-200 pt-5">
            <div className="flex flex-wrap items-center gap-4">
              <AddToCartButton
                variantId={primaryVariant.id}
                productSlug={product.slug}
                productName={product.name}
                sku={primaryVariant.internalSku}
                isOrderable={primaryVariant.isOrderable}
                unitPriceRsd={primaryVariant.priceRsd}
              />
              <Link
                href="/checkout"
                className="rounded-md border border-[#101c32] px-4 py-2.5 text-sm font-bold text-[#101c32] hover:bg-slate-100 transition"
              >
                Pregledaj korpu i poruči →
              </Link>
            </div>

            <div className="grid gap-2 rounded-md bg-[#edf3f7] p-3 text-xs text-[#172942] sm:grid-cols-2">
              <div>
                ✓ <strong>Plaćanje pouzećem ili IPS QR:</strong> bez rizika pri kupovini.
              </div>
              <div>
                ✓ <strong>Pravo na odustanak:</strong> 14 dana od prijema pošiljke bez navođenja razloga.
              </div>
            </div>
          </div>
        </div>
      </div>

      <ProductReviewsSection
        productSlug={product.slug}
        initialReviews={product.reviews || []}
        aggregateRating={product.aggregateRating}
      />

      {/* Sticky Mobile Bottom CTA Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-20 flex items-center justify-between border-t border-slate-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur md:hidden">
        <div>
          <div className="text-[11px] text-slate-500">Cena sa PDV-om:</div>
          <div className="text-base font-extrabold text-[#101c32]">
            {formatRsd(primaryVariant.priceRsd)}
          </div>
        </div>
        <AddToCartButton
          variantId={primaryVariant.id}
          productSlug={product.slug}
          productName={product.name}
          sku={primaryVariant.internalSku}
          isOrderable={primaryVariant.isOrderable}
          unitPriceRsd={primaryVariant.priceRsd}
        />
      </div>
    </div>
  );
}

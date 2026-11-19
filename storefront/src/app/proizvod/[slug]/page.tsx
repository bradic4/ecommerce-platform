import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import React from "react";
import { AddToCartButton } from "@/components/AddToCartButton";
import {
  IconChevronRight,
  IconShield,
  IconTruck,
} from "@/components/Icons";
import { ProductReviewsSection } from "@/components/ProductReviewsSection";
import { ProductInteractiveGallery } from "@/components/ProductVisual";
import { StockMeter } from "@/components/StockMeter";
import { fetchProductBySlug, formatRsd, SITE_URL } from "@/lib/api";
import { STORE_CONFIG } from "@/lib/store-config";

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

  const productJsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: primaryVariant.internalSku,
    gtin13: primaryVariant.gtinEan || product.gtinEan || undefined,
    description: product.description || product.shortSpecification,
    image: [`${SITE_URL}/api/og/product/${product.slug}.png`],
    brand: {
      "@type": "Brand",
      name: STORE_CONFIG.brandName,
    },
    offers: {
      "@type": "Offer",
      url: `${SITE_URL}/proizvod/${product.slug}`,
      priceCurrency: "RSD",
      price: primaryVariant.priceRsd.toFixed(2),
      priceValidUntil: "2027-12-31",
      availability: primaryVariant.schemaAvailability,
      itemCondition: "https://schema.org/NewCondition",
      seller: {
        "@type": "Organization",
        name: STORE_CONFIG.brandName,
      },
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingRate: {
          "@type": "MonetaryAmount",
          value:
            primaryVariant.priceRsd >= STORE_CONFIG.freeShippingThresholdRsd
              ? "0.00"
              : String(STORE_CONFIG.standardShippingCostRsd),
          currency: "RSD",
        },
        shippingDestination: {
          "@type": "DefinedRegion",
          addressCountry: "RS",
        },
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          handlingTime: {
            "@type": "QuantitativeValue",
            minValue: 0,
            maxValue: 1,
            unitCode: "DAY",
          },
          transitTime: {
            "@type": "QuantitativeValue",
            minValue: 1,
            maxValue: primaryVariant.ownStockAvailable ? 2 : 5,
            unitCode: "DAY",
          },
        },
      },
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "RS",
        returnPolicyCategory:
          "https://schema.org/MerchantReturnFiniteReturnWindow",
        merchantReturnDays: 14,
        returnMethod: "https://schema.org/ReturnByMail",
      },
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

  if (product.reviews && product.reviews.length > 0) {
    productJsonLd.review = product.reviews.map((r) => ({
      "@type": "Review",
      author: {
        "@type": "Person",
        name: r.authorName,
      },
      datePublished: r.createdAt.slice(0, 10),
      name: r.title,
      reviewBody: r.comment,
      reviewRating: {
        "@type": "Rating",
        ratingValue: r.rating,
        bestRating: 5,
        worstRating: 1,
      },
    }));
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
    <div className="space-y-8 pb-16 md:pb-0">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <nav aria-label="Putanja stranice" className="text-xs text-slate-500">
        <Link href="/" className="hover:text-brand-700 hover:underline">
          Početna
        </Link>
        {product.category && (
          <>
            {" "}
            /{" "}
            <Link
              href={`/kategorija/${product.category.slug}`}
              className="hover:text-brand-700 hover:underline"
            >
              {product.category.name}
            </Link>
          </>
        )}{" "}
        / <span className="font-semibold text-slate-800">{product.name}</span>
      </nav>

      <div className="grid gap-8 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs md:grid-cols-12">
        {/* Left: Interactive 3-Tab Product Gallery */}
        <div className="flex flex-col justify-between md:col-span-5">
          <ProductInteractiveGallery
            slug={product.slug}
            name={product.name}
            sku={primaryVariant.internalSku}
            shortSpec={product.shortSpecification}
            ownStockAvailable={primaryVariant.ownStockAvailable}
          />

          <dl className="mt-5 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs">
            <div className="flex justify-between">
              <dt className="text-slate-500">Interna šifra (SKU):</dt>
              <dd className="font-mono font-bold text-brand-700 tabular-nums">
                {primaryVariant.internalSku}
              </dd>
            </div>
            {primaryVariant.gtinEan && (
              <div className="flex justify-between">
                <dt className="text-slate-500">EAN / GTIN barkod:</dt>
                <dd className="font-mono text-brand-700 tabular-nums">
                  {primaryVariant.gtinEan}
                </dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-slate-500">Zakonska saobraznost:</dt>
              <dd className="font-bold text-stock-700">
                24 meseca uz fiskalni račun
              </dd>
            </div>
          </dl>
        </div>

        {/* Right: Main Offer, StockMeter, Specs & Purchase Controls */}
        <div className="flex flex-col justify-between md:col-span-7">
          <div>
            <h1 className="text-2xl font-extrabold text-brand-700 md:text-3xl leading-tight">
              {product.name}
            </h1>

            <div className="mt-4">
              <StockMeter
                ownStockAvailable={primaryVariant.ownStockAvailable}
                isOrderable={primaryVariant.isOrderable}
                statusLabel={primaryVariant.publicStatusLabel}
              />
            </div>

            <div className="mt-4 rounded-xl bg-slate-50 p-5 border border-slate-200">
              <span className="block text-xs font-medium text-slate-500">
                Maloprodajna cena sa PDV-om:
              </span>
              <div className="mt-1 text-3xl font-extrabold text-brand-700 tabular-nums">
                {formatRsd(primaryVariant.priceRsd)}
              </div>
              <p className="mt-1.5 text-xs text-slate-600">
                {primaryVariant.priceRsd >=
                STORE_CONFIG.freeShippingThresholdRsd ? (
                  <strong className="text-stock-600">
                    Ovaj proizvod ostvaruje besplatnu dostavu (0 RSD) na
                    teritoriji Srbije.
                  </strong>
                ) : (
                  <>
                    Dostava kurirskom službom:{" "}
                    <strong className="tabular-nums">
                      {formatRsd(STORE_CONFIG.standardShippingCostRsd)}
                    </strong>{" "}
                    (besplatna za porudžbine preko{" "}
                    <span className="tabular-nums">
                      {formatRsd(STORE_CONFIG.freeShippingThresholdRsd)}
                    </span>
                    ).
                  </>
                )}
              </p>
            </div>

            <div className="mt-6">
              <h2 className="text-base font-extrabold text-brand-700">
                Tehničke specifikacije i opis uređaja
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
                {product.description}
              </p>

              {product.shortSpecification && (
                <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <tbody className="divide-y divide-slate-200">
                      {product.shortSpecification
                        .split(/[|•]/)
                        .map((part) => part.trim())
                        .filter(Boolean)
                        .map((spec, idx) => {
                          const [k, v] = spec.includes(":")
                            ? spec.split(":", 2)
                            : [`Tehnički parametar #${idx + 1}`, spec];
                          return (
                            <tr key={idx} className="odd:bg-slate-50/70">
                              <th className="w-2/5 px-3.5 py-2.5 font-semibold text-slate-600">
                                {k.trim()}
                              </th>
                              <td className="px-3.5 py-2.5 font-bold text-brand-700">
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
            <div className="flex flex-wrap items-center gap-3">
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
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-brand-700 hover:bg-slate-100 transition"
              >
                <span>Završi kupovinu</span>
                <IconChevronRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid gap-3 rounded-xl bg-brand-50/60 border border-brand-100 p-3.5 text-xs text-brand-800 sm:grid-cols-2">
              <div className="flex items-start gap-2">
                <IconTruck className="h-4 w-4 shrink-0 text-brand-700 mt-0.5" />
                <span>
                  <strong>Plaćanje pouzećem ili IPS QR:</strong> platite kuriru
                  tek pri preuzimanju paketa.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <IconShield className="h-4 w-4 shrink-0 text-brand-700 mt-0.5" />
                <span>
                  <strong>14 dana pravo na odustanak:</strong> povrat robe bez
                  navođenja razloga.
                </span>
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
          <div className="text-base font-extrabold text-brand-700 tabular-nums">
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

import Link from "next/link";
import React from "react";
import { CatalogProductItemDto, formatRsd } from "@/lib/api";
import { AddToCartButton } from "./AddToCartButton";
import { CompareButton } from "./CompareButton";
import { ProductVisual } from "./ProductVisual";

export function ProductCard({ product }: { product: CatalogProductItemDto }) {
  const specTags = (product.shortSpecification || "")
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3);

  return (
    <article
      className="group flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-4 transition duration-200 hover:border-brand-500/40"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div>
        <Link
          href={`/proizvod/${product.slug}`}
          className="block cursor-pointer focus:outline-none"
        >
          <ProductVisual
            slug={product.slug}
            name={product.name}
            sku={product.sku}
            brandName={product.brandName}
            shortSpec={product.shortSpecification}
            ownStockAvailable={product.ownStockAvailable}
            isOrderable={product.isOrderable}
            size="card"
          />
        </Link>

        <div className="mt-3.5 flex items-center justify-between gap-2 text-xs">
          {product.categorySlug ? (
            <Link
              href={`/kategorija/${product.categorySlug}`}
              className="font-semibold text-brand-700 hover:underline"
            >
              {product.categoryName}
            </Link>
          ) : (
            <span className="text-slate-500">Katalog</span>
          )}
        </div>

        <h3 className="mt-1 text-base font-bold leading-snug text-brand-700">
          <Link
            href={`/proizvod/${product.slug}`}
            className="hover:text-brand-600 transition"
          >
            {product.name}
          </Link>
        </h3>

        {specTags.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {specTags.map((tag, idx) => (
              <span
                key={idx}
                className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 border-t border-slate-100 pt-3.5">
        <div className="mb-3 flex items-baseline justify-between">
          <div>
            <span className="block text-[11px] font-medium text-slate-500">
              Cena sa uračunatim PDV-om
            </span>
            <span className="text-xl font-extrabold text-brand-700 tabular-nums">
              {formatRsd(product.priceRsd)}
            </span>
          </div>
          <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
            Garancija 24m
          </span>
        </div>

        <div className="flex items-center gap-2">
          {product.variantId && (
            <AddToCartButton
              variantId={product.variantId}
              productSlug={product.slug}
              productName={product.name}
              sku={product.sku || ""}
              isOrderable={product.isOrderable}
              unitPriceRsd={product.priceRsd}
              fullWidth
            />
          )}
          <CompareButton
            item={{
              id: product.id,
              slug: product.slug,
              name: product.name,
              sku: product.sku,
              ean: product.ean,
              priceRsd: product.priceRsd,
              shortSpecification: product.shortSpecification,
              availabilityLabel: product.availabilityLabel,
              isOrderable: product.isOrderable,
              variantId: product.variantId,
            }}
          />
        </div>
      </div>
    </article>
  );
}

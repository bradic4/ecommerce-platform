import Link from "next/link";
import React from "react";
import { CatalogProductItemDto, formatRsd } from "@/lib/api";
import { AddToCartButton } from "./AddToCartButton";
import { CompareButton } from "./CompareButton";

export function ProductCard({ product }: { product: CatalogProductItemDto }) {
  return (
    <article className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-5 shadow-xs transition hover:border-slate-300 hover:shadow-md">
      <div>
        <div className="mb-2 flex items-center justify-between gap-2 text-xs">
          {product.categorySlug ? (
            <Link
              href={`/kategorija/${product.categorySlug}`}
              className="font-semibold text-[#245eac] hover:underline"
            >
              {product.categoryName}
            </Link>
          ) : (
            <span className="text-slate-500">Katalog</span>
          )}
          <span className="font-mono text-slate-500">
            {product.brandName ? `${product.brandName} • ` : ""}SKU: {product.sku}
          </span>
        </div>

        <h2 className="mb-2 text-base font-bold leading-snug text-[#101c32]">
          <Link
            href={`/proizvod/${product.slug}`}
            className="hover:text-[#245eac] transition"
          >
            {product.name}
          </Link>
        </h2>

        {product.shortSpecification && (
          <p className="mb-4 text-xs leading-relaxed text-slate-600">
            {product.shortSpecification}
          </p>
        )}
      </div>

      <div className="mt-2 border-t border-slate-100 pt-3">
        <div className="mb-3 flex items-baseline justify-between">
          <div>
            <span className="block text-[11px] text-slate-500">
              Prodajna cena (sa PDV-om):
            </span>
            <span className="text-lg font-extrabold text-[#101c32]">
              {formatRsd(product.priceRsd)}
            </span>
          </div>
          <span
            className={`inline-block rounded px-2 py-0.5 text-[11px] font-semibold ${
              product.ownStockAvailable
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : product.isOrderable
                ? "bg-blue-50 text-blue-700 border border-blue-200"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {product.availabilityLabel}
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

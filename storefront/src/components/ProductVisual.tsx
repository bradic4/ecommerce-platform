"use client";

import React, { useState } from "react";
import { NaLageruMark } from "./Logo";
import { StockPill } from "./StockMeter";

interface ProductVisualProps {
  slug: string;
  name: string;
  sku?: string;
  brandName?: string;
  shortSpec?: string;
  imageUrl?: string;
  ownStockAvailable?: boolean;
  isOrderable?: boolean;
  size?: "card" | "hero";
}

/**
 * Prikazuje pravu fotografiju proizvoda (kada je unet imageUrl) ili miran,
 * čist studijski placeholder sa NaLageru znakom, brendom, šifrom i StockPill bedžom.
 */
export function ProductVisual({
  slug,
  name,
  sku,
  brandName,
  shortSpec,
  imageUrl,
  ownStockAvailable,
  isOrderable = true,
  size = "card",
}: ProductVisualProps) {
  const isHero = size === "hero";
  const topSpecChip = (shortSpec || "").split("|")[0]?.trim();

  return (
    <div
      className={`relative flex flex-col items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-b from-slate-50 to-slate-100/90 select-none ${
        isHero ? "h-80 sm:h-96 p-6" : "h-48 p-4"
      }`}
      role="img"
      aria-label={name}
      data-slug={slug}
    >
      {typeof ownStockAvailable === "boolean" && size === "card" && (
        <span className="absolute left-3 top-3 z-10">
          <StockPill
            ownStockAvailable={ownStockAvailable}
            isOrderable={isOrderable}
          />
        </span>
      )}

      {brandName && size === "card" && (
        <span className="absolute right-3 top-3 z-10 rounded-md bg-white/90 border border-slate-200/80 px-2 py-0.5 text-[11px] font-bold text-brand-700">
          {brandName}
        </span>
      )}

      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={name}
          className={`object-contain transition duration-300 group-hover:scale-[1.03] ${
            isHero ? "max-h-64" : "max-h-28 mt-4"
          }`}
        />
      ) : (
        <div className="flex flex-col items-center justify-center text-center mt-3">
          <div className="relative flex items-center justify-center rounded-2xl bg-white p-3.5 shadow-2xs border border-slate-200/70">
            <NaLageruMark
              className={`${isHero ? "h-16 w-16" : "h-10 w-10"}`}
            />
          </div>
          {topSpecChip && (
            <span className="mt-2.5 rounded-md bg-brand-700 px-2.5 py-0.5 text-[11px] font-bold text-accent-400">
              {topSpecChip}
            </span>
          )}
        </div>
      )}

      {sku && (
        <span className="absolute bottom-2.5 right-3 text-[11px] font-medium text-slate-500 tabular-nums">
          {sku}
        </span>
      )}
    </div>
  );
}

export function ProductInteractiveGallery({
  slug,
  name,
  sku,
  brandName,
  shortSpec,
  imageUrl,
  ownStockAvailable,
  isOrderable = true,
}: ProductVisualProps) {
  const [activeTab, setActiveTab] = useState<"studio" | "specs" | "package">(
    "studio"
  );

  const specItems = (shortSpec || "")
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div className="space-y-3">
      {activeTab === "studio" && (
        <ProductVisual
          slug={slug}
          name={name}
          sku={sku}
          brandName={brandName}
          shortSpec={shortSpec}
          imageUrl={imageUrl}
          ownStockAvailable={ownStockAvailable}
          isOrderable={isOrderable}
          size="hero"
        />
      )}

      {activeTab === "specs" && (
        <div className="flex h-80 sm:h-96 flex-col justify-between rounded-xl border border-slate-200 bg-brand-700 p-6 text-white">
          <div className="flex items-center justify-between border-b border-brand-600 pb-3">
            <span className="font-bold text-sm text-accent-400">
              Tehnička karta uređaja
            </span>
            <span className="font-mono text-xs text-slate-300 tabular-nums">
              {sku}
            </span>
          </div>
          <div className="my-auto grid gap-3 sm:grid-cols-2">
            {specItems.map((item, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-brand-600 bg-brand-800/90 p-3 text-xs"
              >
                <div className="text-slate-300">Karakteristika #{idx + 1}</div>
                <div className="mt-1 font-bold text-white">{item}</div>
              </div>
            ))}
          </div>
          <div className="border-t border-brand-600 pt-3 text-[11px] text-slate-300">
            Svi tehnički podaci su provereni prema deklaraciji proizvođača i uvoznika za Republiku Srbiju.
          </div>
        </div>
      )}

      {activeTab === "package" && (
        <div className="flex h-80 sm:h-96 flex-col justify-between rounded-xl border border-brand-200 bg-brand-50/50 p-6 text-slate-900">
          <div>
            <h3 className="text-base font-extrabold text-brand-800">
              Šta dobijate u paketu uz porudžbinu
            </h3>
            <ul className="mt-4 space-y-2.5 text-xs text-slate-700">
              <li className="flex items-center gap-2 font-semibold">
                <span className="h-2 w-2 rounded-full bg-brand-700" />
                Originalno fabričko pakovanje: {name}
              </li>
              <li className="flex items-center gap-2 font-semibold">
                <span className="h-2 w-2 rounded-full bg-brand-700" />
                Fiskalni račun sa QR kodom Poreske uprave RS (garantni list 24 meseca)
              </li>
              <li className="flex items-center gap-2 font-semibold">
                <span className="h-2 w-2 rounded-full bg-brand-700" />
                Uputstvo za bezbednu upotrebu na srpskom jeziku
              </li>
              <li className="flex items-center gap-2 font-semibold">
                <span className="h-2 w-2 rounded-full bg-brand-700" />
                Zakonsko pravo na zamenu ili povrat novca u roku od 14 dana
              </li>
            </ul>
          </div>
          <div className="rounded-lg border border-brand-200 bg-white p-3 text-xs text-slate-600">
            Svaki paket se fizički pregleda i zaštićeno pakuje pre predaje kurirskoj službi.
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2.5">
        <button
          type="button"
          onClick={() => setActiveTab("studio")}
          className={`cursor-pointer rounded-lg border px-3 py-2 text-xs font-bold transition ${
            activeTab === "studio"
              ? "border-brand-700 bg-brand-50 text-brand-800"
              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
          }`}
        >
          1. Prikaz uređaja
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("specs")}
          className={`cursor-pointer rounded-lg border px-3 py-2 text-xs font-bold transition ${
            activeTab === "specs"
              ? "border-brand-700 bg-brand-50 text-brand-800"
              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
          }`}
        >
          2. Tehnička šema
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("package")}
          className={`cursor-pointer rounded-lg border px-3 py-2 text-xs font-bold transition ${
            activeTab === "package"
              ? "border-brand-700 bg-brand-50 text-brand-800"
              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
          }`}
        >
          3. Sadržaj paketa
        </button>
      </div>
    </div>
  );
}

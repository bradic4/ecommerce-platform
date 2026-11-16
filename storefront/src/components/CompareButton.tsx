"use client";

import React from "react";
import { CompareProductItem, useCart } from "./CartContext";
import { IconCheck, IconCompare } from "./Icons";

export function CompareButton({ item }: { item: CompareProductItem }) {
  const { compareItems, toggleCompareItem } = useCart();
  const isSelected = compareItems.some((c) => c.id === item.id);

  return (
    <button
      type="button"
      onClick={() => toggleCompareItem(item)}
      aria-label={
        isSelected
          ? `Ukloni ${item.name} iz poređenja`
          : `Dodaj ${item.name} u poređenje specifikacija`
      }
      title="Uporedi tehničke specifikacije (maks. 4 uređaja)"
      className={`cursor-pointer inline-flex items-center gap-1 rounded-lg border px-2.5 py-2.5 text-xs font-bold transition duration-200 ${
        isSelected
          ? "border-[#059669] bg-emerald-50 text-[#064E3B]"
          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      {isSelected ? (
        <>
          <IconCheck className="h-3.5 w-3.5 text-[#059669]" />
          <span>U poređenju</span>
        </>
      ) : (
        <>
          <IconCompare className="h-3.5 w-3.5 text-slate-500" />
          <span>Uporedi</span>
        </>
      )}
    </button>
  );
}

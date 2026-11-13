"use client";

import React from "react";
import { CompareProductItem, useCart } from "./CartContext";

export function CompareButton({ item }: { item: CompareProductItem }) {
  const { compareItems, toggleCompareItem } = useCart();
  const isSelected = compareItems.some((c) => c.id === item.id);

  return (
    <button
      type="button"
      onClick={() => toggleCompareItem(item)}
      title="Dodaj u tabelu za upoređivanje specifikacija (maks. 4)"
      className={`rounded border px-2 py-1 text-[11px] font-semibold transition ${
        isSelected
          ? "border-[#0f807f] bg-teal-50 text-[#0f807f]"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
      }`}
    >
      {isSelected ? "✓ U poređenju" : "+ Uporedi"}
    </button>
  );
}

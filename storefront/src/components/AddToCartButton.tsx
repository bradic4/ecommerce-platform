"use client";

import React, { useState } from "react";
import { useCart } from "./CartContext";

interface AddToCartButtonProps {
  variantId: string;
  productSlug: string;
  productName: string;
  sku: string;
  isOrderable: boolean;
  unitPriceRsd?: number;
  fullWidth?: boolean;
}

export function AddToCartButton({
  variantId,
  productSlug,
  productName,
  sku,
  isOrderable,
  unitPriceRsd,
  fullWidth = false,
}: AddToCartButtonProps) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  if (!isOrderable) {
    return (
      <button
        type="button"
        disabled
        className={`${fullWidth ? "w-full" : ""} cursor-not-allowed rounded-md bg-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-500`}
      >
        Trenutno nedostupno
      </button>
    );
  }

  const handleClick = () => {
    addItem({ variantId, productSlug, productName, sku, unitPriceRsd }, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`${fullWidth ? "w-full" : ""} rounded-md px-4 py-2.5 text-sm font-bold text-white transition ${
        added
          ? "bg-emerald-600"
          : "bg-[#101c32] hover:bg-[#1e3358]"
      }`}
    >
      {added ? "✓ Dodato u korpu" : "Dodaj u korpu"}
    </button>
  );
}

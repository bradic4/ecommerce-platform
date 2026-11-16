"use client";

import React, { useState } from "react";
import { useCart } from "./CartContext";
import { IconCart, IconCheck } from "./Icons";

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
        className={`${
          fullWidth ? "w-full" : ""
        } cursor-not-allowed rounded-lg bg-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-500`}
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
      className={`${
        fullWidth ? "w-full" : ""
      } cursor-pointer inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold text-white shadow-xs transition duration-200 ${
        added
          ? "bg-[#059669]"
          : "bg-[#EA580C] hover:bg-[#D97706] active:translate-y-0"
      }`}
    >
      {added ? (
        <>
          <IconCheck className="h-4 w-4" />
          <span>Dodato u korpu</span>
        </>
      ) : (
        <>
          <IconCart className="h-4 w-4" />
          <span>Dodaj u korpu</span>
        </>
      )}
    </button>
  );
}

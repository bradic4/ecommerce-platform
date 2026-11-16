"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export interface CartItem {
  variantId: string;
  productSlug: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPriceRsd?: number;
}

export interface CompareProductItem {
  id: string;
  slug: string;
  name: string;
  sku?: string;
  ean?: string;
  priceRsd: number;
  shortSpecification?: string;
  availabilityLabel: string;
  isOrderable: boolean;
  variantId?: string;
}

interface CartContextValue {
  items: CartItem[];
  totalQuantity: number;
  addItem: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  updateQuantity: (variantId: string, qty: number) => void;
  removeItem: (variantId: string) => void;
  clearCart: () => void;
  compareItems: CompareProductItem[];
  toggleCompareItem: (item: CompareProductItem) => void;
  clearCompare: () => void;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);
const STORAGE_KEY = "porodicna_prodavnica_cart_v1";
const COMPARE_STORAGE_KEY = "porodicna_prodavnica_compare_v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [compareItems, setCompareItems] = useState<CompareProductItem[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setItems(parsed);
      }
      const rawComp = localStorage.getItem(COMPARE_STORAGE_KEY);
      if (rawComp) {
        const parsedComp = JSON.parse(rawComp);
        if (Array.isArray(parsedComp)) setCompareItems(parsedComp);
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  const persist = (next: CartItem[]) => {
    setItems(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage errors
    }
  };

  const addItem = (item: Omit<CartItem, "quantity">, qty = 1) => {
    const existing = items.find((i) => i.variantId === item.variantId);
    if (existing) {
      persist(
        items.map((i) =>
          i.variantId === item.variantId
            ? {
                ...i,
                quantity: Math.min(20, i.quantity + qty),
                unitPriceRsd: item.unitPriceRsd ?? i.unitPriceRsd,
              }
            : i
        )
      );
    } else {
      persist([...items, { ...item, quantity: Math.max(1, qty) }]);
    }
    setIsDrawerOpen(true);
  };

  const updateQuantity = (variantId: string, qty: number) => {
    if (qty <= 0) {
      persist(items.filter((i) => i.variantId !== variantId));
      return;
    }
    persist(
      items.map((i) =>
        i.variantId === variantId ? { ...i, quantity: Math.min(20, qty) } : i
      )
    );
  };

  const removeItem = (variantId: string) => {
    persist(items.filter((i) => i.variantId !== variantId));
  };

  const clearCart = () => persist([]);

  const persistCompare = (next: CompareProductItem[]) => {
    setCompareItems(next);
    try {
      localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage errors
    }
  };

  const toggleCompareItem = (item: CompareProductItem) => {
    const exists = compareItems.some((c) => c.id === item.id);
    if (exists) {
      persistCompare(compareItems.filter((c) => c.id !== item.id));
    } else if (compareItems.length < 4) {
      persistCompare([...compareItems, item]);
    }
  };

  const clearCompare = () => persistCompare([]);

  const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        totalQuantity,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        compareItems,
        toggleCompareItem,
        clearCompare,
        isDrawerOpen,
        openDrawer: () => setIsDrawerOpen(true),
        closeDrawer: () => setIsDrawerOpen(false),
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}

import type { Metadata } from "next";
import React, { Suspense } from "react";
import "./globals.css";
import { CartProvider } from "@/components/CartContext";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { SITE_URL } from "@/lib/api";
import { STORE_CONFIG } from "@/lib/store-config";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${STORE_CONFIG.brandName} | Porodična Internet Prodavnica Srbija`,
    template: `%s | ${STORE_CONFIG.brandName}`,
  },
  description:
    "Provereni aku i električni alati, oprema za kuću i dvorište. Tačno stanje lagera, jasni troškovi isporuke i plaćanje pouzećem širom Srbije.",
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sr">
      <body className="flex min-h-screen flex-col">
        <CartProvider>
          <Suspense fallback={<div className="h-20 bg-[#101c32]" />}>
            <Header />
          </Suspense>

          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
            {children}
          </main>

          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}

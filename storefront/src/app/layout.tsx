import type { Metadata } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import React, { Suspense } from "react";
import "./globals.css";
import { CartProvider } from "@/components/CartContext";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { SITE_URL } from "@/lib/api";
import { STORE_CONFIG } from "@/lib/store-config";

const display = Bricolage_Grotesque({
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

const body = Figtree({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${STORE_CONFIG.brandName} | ${STORE_CONFIG.metaTitleSuffix}`,
    template: `%s | ${STORE_CONFIG.brandName}`,
  },
  description: STORE_CONFIG.metaDescription,
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
    <html lang="sr" className={`${display.variable} ${body.variable}`}>
      <body className="flex min-h-screen flex-col antialiased">
        <CartProvider>
          <Suspense fallback={<div className="h-24 bg-brand-700" />}>
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

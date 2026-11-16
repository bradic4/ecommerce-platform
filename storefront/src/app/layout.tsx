import type { Metadata } from "next";
import { JetBrains_Mono, Nunito_Sans, Rubik } from "next/font/google";
import React, { Suspense } from "react";
import "./globals.css";
import { CartProvider } from "@/components/CartContext";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { SITE_URL } from "@/lib/api";
import { STORE_CONFIG } from "@/lib/store-config";

const rubik = Rubik({
  subsets: ["latin", "latin-ext", "cyrillic"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-heading",
  display: "swap",
});

const nunitoSans = Nunito_Sans({
  subsets: ["latin", "latin-ext", "cyrillic"],
  weight: ["400", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin", "latin-ext"],
  weight: ["500", "700"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${STORE_CONFIG.brandName} | Specijalizovana Prodavnica Alata i Opreme`,
    template: `%s | ${STORE_CONFIG.brandName}`,
  },
  description:
    "Provereni aku i električni alati, aparati za varenje i oprema za dvorište. Tačno stanje lagera, isporuka 24-48h i plaćanje pouzećem ili NBS IPS QR kodom.",
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
    <html
      lang="sr"
      className={`${rubik.variable} ${nunitoSans.variable} ${jetbrainsMono.variable}`}
    >
      <body className="flex min-h-screen flex-col antialiased">
        <CartProvider>
          <Suspense fallback={<div className="h-24 bg-[#0F172A]" />}>
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

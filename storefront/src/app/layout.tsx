import type { Metadata } from "next";
import Link from "next/link";
import React, { Suspense } from "react";
import "./globals.css";
import { CartProvider } from "@/components/CartContext";
import { Header } from "@/components/Header";
import { SITE_URL } from "@/lib/api";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Alati & Domaćinstvo | Porodična Internet Prodavnica Srbija",
    template: "%s | Alati & Domaćinstvo",
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

          <footer className="mt-16 border-t border-slate-200 bg-[#101c32] text-slate-300">
            <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-3 text-sm">
              <div>
                <h3 className="mb-2 font-bold text-white uppercase tracking-wider text-xs">
                  Podaci o trgovcu (Sekcija 13.3 / AT-16)
                </h3>
                <p className="leading-relaxed text-xs text-slate-300">
                  Porodična Prodavnica Alati &amp; Domaćinstvo DOO Beograd
                  <br />
                  Delatnost: Trgovina na malo posredstvom interneta (4791)
                  <br />
                  Kontakt za kupce i reklamacije: podrska@prodavnica.rs | +381 11 555 0100
                </p>
              </div>
              <div>
                <h3 className="mb-2 font-bold text-white uppercase tracking-wider text-xs">
                  Kategorije kataloga
                </h3>
                <ul className="space-y-1.5 text-xs">
                  <li>
                    <Link href="/kategorija/aku-i-elektricni-alati" className="hover:text-white">
                      Aku i električni alati
                    </Link>
                  </li>
                  <li>
                    <Link href="/kategorija/oprema-za-kucu-i-dvoriste" className="hover:text-white">
                      Oprema za kuću i dvorište
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="mb-2 font-bold text-white uppercase tracking-wider text-xs">
                  Potrošačka prava i informacije
                </h3>
                <ul className="space-y-1.5 text-xs">
                  <li>
                    <Link href="/uslovi-kupovine" className="hover:text-white">
                      Dostava, plaćanje pouzećem i troškovi isporuke
                    </Link>
                  </li>
                  <li>
                    <Link href="/uslovi-kupovine#odustanak" className="hover:text-white">
                      Pravo na odustanak od ugovora u roku od 14 dana
                    </Link>
                  </li>
                  <li>
                    <Link href="/uslovi-kupovine#reklamacije" className="hover:text-white">
                      Postupak reklamacije i saobraznost (24 meseca)
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
            <div className="border-t border-slate-800 py-4 text-center text-xs text-slate-400">
              © {new Date().getFullYear()} Porodična Internet Prodavnica • Cene su iskazane u dinarima (RSD).
            </div>
          </footer>
        </CartProvider>
      </body>
    </html>
  );
}

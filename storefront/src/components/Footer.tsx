import Link from "next/link";
import React from "react";
import { formatRsd } from "@/lib/api";
import { STORE_CONFIG } from "@/lib/store-config";
import { IconBox, IconCheck, IconShield, IconTruck } from "./Icons";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-brand-800 bg-brand-800 text-slate-300">
      {/* Top Guarantees Strip */}
      <div className="border-b border-brand-800/80 bg-brand-700 py-7">
        <div className="mx-auto grid max-w-6xl gap-5 px-4 sm:grid-cols-2 lg:grid-cols-4">
          {STORE_CONFIG.trustHighlights.map((item, idx) => (
            <div
              key={idx}
              className="rounded-xl bg-brand-800/90 p-4 border border-brand-600/60"
            >
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                {idx === 0 && (
                  <IconTruck className="h-4 w-4 text-accent-400" />
                )}
                {idx === 1 && (
                  <IconShield className="h-4 w-4 text-accent-400" />
                )}
                {idx === 2 && (
                  <IconCheck className="h-4 w-4 text-accent-400" />
                )}
                {idx === 3 && <IconBox className="h-4 w-4 text-accent-400" />}
                <span>{item.title}</span>
              </div>
              <p className="mt-1.5 text-xs text-slate-300 leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Main Footer Columns */}
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-xs sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo tone="light" size="sm" />
          <p className="mt-2.5 text-slate-300 leading-relaxed">
            {STORE_CONFIG.brandTagline}. Besplatna isporuka za sve porudžbine
            preko{" "}
            <strong className="text-white tabular-nums">
              {formatRsd(STORE_CONFIG.freeShippingThresholdRsd)}
            </strong>
            .
          </p>
          <div className="mt-4 space-y-1 text-slate-300">
            <div>
              Kontakt telefon:{" "}
              <a
                href={STORE_CONFIG.supportPhoneHref}
                className="font-bold text-white hover:underline tabular-nums"
              >
                {STORE_CONFIG.supportPhoneDisplay}
              </a>
            </div>
            <div>Email: {STORE_CONFIG.supportEmail}</div>
            <div className="text-slate-400">{STORE_CONFIG.workingHours}</div>
          </div>
        </div>

        <div>
          <h3 className="mb-3 font-heading text-sm font-bold text-white">
            Katalog i tehnički vodiči
          </h3>
          <ul className="space-y-2">
            <li>
              <Link
                href="/kategorija/tehnika-i-elektronika"
                className="hover:text-accent-400 hover:underline"
              >
                Tehnika i elektronika
              </Link>
            </li>
            <li>
              <Link
                href="/kategorija/aku-i-elektricni-alati"
                className="hover:text-accent-400 hover:underline"
              >
                Aku i električni alati
              </Link>
            </li>
            <li>
              <Link
                href="/kategorija/oprema-za-kucu-i-dvoriste"
                className="hover:text-accent-400 hover:underline"
              >
                Oprema za kuću i dvorište
              </Link>
            </li>
            <li>
              <Link
                href="/vodici"
                className="hover:text-accent-400 hover:underline"
              >
                Tehnički vodiči za kupovinu (Blog)
              </Link>
            </li>
            <li>
              <Link
                href="/uporedi"
                className="hover:text-accent-400 hover:underline"
              >
                Uporedni pregled specifikacija
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="mb-3 font-heading text-sm font-bold text-white">
            Korisnički servis i prava kupaca
          </h3>
          <ul className="space-y-2">
            <li>
              <Link
                href="/provera-porudzbine"
                className="hover:text-white hover:underline"
              >
                Provera statusa porudžbine (bez naloga)
              </Link>
            </li>
            <li>
              <Link
                href="/reklamacije"
                className="font-semibold text-accent-400 hover:text-accent-300 hover:underline"
              >
                Online Reklamacije (24m) i Odustanak (14 dana)
              </Link>
            </li>
            <li>
              <Link
                href="/uslovi-kupovine"
                className="hover:text-white hover:underline"
              >
                Uslovi kupovine, isporuka i politika privatnosti
              </Link>
            </li>
            <li>
              <Link
                href="/admin"
                className="font-semibold text-white hover:text-accent-400 hover:underline"
              >
                Operativni Admin centar (Obuka i upravljanje)
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="mb-3 font-heading text-sm font-bold text-white">
            Podaci o trgovcu i plaćanju
          </h3>
          <div className="space-y-1.5 text-slate-300">
            <div className="font-semibold text-white">
              {STORE_CONFIG.legalInfo.companyName}
            </div>
            <div>Šifra delatnosti: {STORE_CONFIG.legalInfo.activityCode}</div>
            <div>Mesto: {STORE_CONFIG.legalInfo.city}</div>
          </div>
          <div className="mt-4 flex flex-wrap gap-1.5">
            <span className="rounded-md bg-brand-700 px-2.5 py-1 text-[11px] font-bold text-slate-100 border border-brand-600">
              Pouzeće (Gotovina kuriru)
            </span>
            <span className="rounded-md bg-accent-400/15 px-2.5 py-1 text-[11px] font-bold text-accent-400 border border-accent-400/30">
              NBS IPS QR Instant
            </span>
            <span className="rounded-md bg-brand-700 px-2.5 py-1 text-[11px] font-bold text-slate-100 border border-brand-600">
              eFiskalizacija PFR
            </span>
          </div>
        </div>
      </div>

      <div className="border-t border-brand-700/80 py-4 text-center text-[11px] text-slate-400">
        <div className="mx-auto max-w-6xl px-4 flex flex-wrap items-center justify-between gap-2">
          <span>
            &copy; {new Date().getFullYear()} {STORE_CONFIG.brandName} (
            {STORE_CONFIG.domain}). Sve cene su prikazane u dinarima (RSD) sa
            uračunatim PDV-om.
          </span>
          <span>NaLageru Hybrid Inventory E-Commerce</span>
        </div>
      </div>
    </footer>
  );
}

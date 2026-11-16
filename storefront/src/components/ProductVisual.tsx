"use client";

import React, { useState } from "react";

interface ProductVisualProps {
  slug: string;
  name: string;
  sku?: string;
  brandName?: string;
  shortSpec?: string;
  ownStockAvailable?: boolean;
  size?: "card" | "hero";
}

function getToolArchetype(slug: string, name: string) {
  const s = `${slug} ${name}`.toLowerCase();
  if (s.includes("busilica") || s.includes("bušilica") || s.includes("odvrtac")) {
    return {
      kind: "drill" as const,
      accent: "#059669",
      secondary: "#0F172A",
      code: "18V BRUSHLESS",
      metric: "45 Nm • 2×2.0Ah",
    };
  }
  if (s.includes("brusilica")) {
    return {
      kind: "grinder" as const,
      accent: "#0284C7",
      secondary: "#0F172A",
      code: "Ø 125 MM",
      metric: "850W • 11.000 RPM",
    };
  }
  if (s.includes("cekic") || s.includes("čekić") || s.includes("sds")) {
    return {
      kind: "hammer" as const,
      accent: "#EA580C",
      secondary: "#1E293B",
      code: "SDS-PLUS",
      metric: "800W • 2.7 J",
    };
  }
  if (s.includes("varenje") || s.includes("inverter")) {
    return {
      kind: "welder" as const,
      accent: "#D97706",
      secondary: "#111827",
      code: "IGBT 160A",
      metric: "Hot Start • Anti-Stick",
    };
  }
  if (s.includes("perac") || s.includes("perač") || s.includes("pritiskom")) {
    return {
      kind: "washer" as const,
      accent: "#0D9488",
      secondary: "#0F172A",
      code: "ALU PUMPA",
      metric: "135 bar • 420 l/h",
    };
  }
  if (s.includes("multimetar") || s.includes("merni")) {
    return {
      kind: "meter" as const,
      accent: "#DC2626",
      secondary: "#1E293B",
      code: "TRUE-RMS",
      metric: "CAT III 600V",
    };
  }
  if (s.includes("set") || s.includes("alat") || s.includes("kofer") || s.includes("gedora")) {
    return {
      kind: "toolkit" as const,
      accent: "#059669",
      secondary: "#1E293B",
      code: "CR-V ČELIK",
      metric: "94 DELA • 1/4\" & 1/2\"",
    };
  }
  if (s.includes("pumpa") || s.includes("vodu")) {
    return {
      kind: "pump" as const,
      accent: "#0284C7",
      secondary: "#0F172A",
      code: "INOX KUĆIŠTE",
      metric: "750W • 13.000 l/h",
    };
  }
  if (s.includes("reflektor") || s.includes("led")) {
    return {
      kind: "floodlight" as const,
      accent: "#EAB308",
      secondary: "#0F172A",
      code: "IP65 SMD LED",
      metric: "50W • 4500 lm",
    };
  }
  return {
    kind: "trimmer" as const,
    accent: "#16A34A",
    secondary: "#0F172A",
    code: "PRO SERIJA",
    metric: "Garancija 24m",
  };
}

export function ProductVisual({
  slug,
  name,
  sku,
  brandName,
  ownStockAvailable,
  size = "card",
}: ProductVisualProps) {
  const arch = getToolArchetype(slug, name);
  const isHero = size === "hero";

  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-slate-200/90 bg-gradient-to-br from-slate-100 via-white to-slate-100 select-none ${
        isHero ? "h-80 sm:h-96 p-6" : "h-48 p-4"
      }`}
    >
      {/* Subtle Blueprint Engineering Grid */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.06]"
        aria-hidden="true"
      >
        <defs>
          <pattern
            id={`grid-${slug}`}
            width="24"
            height="24"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 24 0 L 0 0 0 24"
              fill="none"
              stroke="#0F172A"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#grid-${slug})`} />
      </svg>

      {/* Top Spec & Brand Badges */}
      <div className="relative z-10 flex items-center justify-between gap-2">
        <span
          className="rounded-md px-2.5 py-1 text-[11px] font-bold tracking-tight text-white shadow-xs"
          style={{ backgroundColor: arch.secondary }}
        >
          {brandName || arch.code}
        </span>
        <span
          className="rounded-md px-2 py-0.5 font-mono text-[11px] font-bold text-white shadow-xs"
          style={{ backgroundColor: arch.accent }}
        >
          {arch.metric}
        </span>
      </div>

      {/* Bespoke Technical Illustration */}
      <div className="relative z-10 flex h-full items-center justify-center pb-4">
        {arch.kind === "drill" && (
          <svg
            viewBox="0 0 220 150"
            className={isHero ? "h-56 w-auto drop-shadow-md" : "h-32 w-auto drop-shadow-xs"}
            role="img"
            aria-label={name}
          >
            {/* Cordless 18V Drill Body */}
            <rect x="48" y="28" width="92" height="42" rx="8" fill={arch.accent} stroke="#0F172A" strokeWidth="3" />
            <rect x="56" y="36" width="38" height="12" rx="3" fill="#0F172A" />
            {/* Chuck & Bit */}
            <path d="M140 36 L166 41 L166 57 L140 62 Z" fill="#334155" stroke="#0F172A" strokeWidth="2.5" />
            <rect x="166" y="47" width="34" height="4" rx="1" fill="#64748B" />
            {/* Ergonomic Handle */}
            <path d="M74 70 L62 118 L94 118 L104 70 Z" fill={arch.accent} stroke="#0F172A" strokeWidth="3" />
            <path d="M78 72 L69 112 L84 112 L91 72 Z" fill="#1E293B" />
            {/* Trigger */}
            <rect x="101" y="74" width="10" height="14" rx="2" fill="#EA580C" />
            {/* 18V Li-Ion Battery Pack */}
            <rect x="52" y="116" width="54" height="22" rx="4" fill="#0F172A" />
            <rect x="60" y="122" width="24" height="8" rx="2" fill="#10B981" />
          </svg>
        )}

        {arch.kind === "grinder" && (
          <svg
            viewBox="0 0 220 150"
            className={isHero ? "h-56 w-auto drop-shadow-md" : "h-32 w-auto drop-shadow-xs"}
            role="img"
            aria-label={name}
          >
            {/* 125mm Cutting Disc */}
            <circle cx="155" cy="76" r="42" fill="#CBD5E1" stroke="#475569" strokeWidth="3" strokeDasharray="8 4" />
            <circle cx="155" cy="76" r="28" fill="none" stroke="#94A3B8" strokeWidth="1.5" />
            {/* Safety Guard & Gear Head */}
            <path d="M132 38 A42 42 0 0 1 182 108 L155 76 Z" fill="#334155" opacity="0.85" />
            <rect x="34" y="60" width="106" height="32" rx="7" fill={arch.accent} stroke="#0F172A" strokeWidth="3" />
            <rect x="46" y="67" width="44" height="16" rx="3" fill="#0F172A" />
            {/* Side Handle */}
            <rect x="126" y="92" width="12" height="36" rx="4" fill="#0F172A" />
            <circle cx="155" cy="76" r="8" fill="#EA580C" stroke="#0F172A" strokeWidth="2.5" />
          </svg>
        )}

        {arch.kind === "welder" && (
          <svg
            viewBox="0 0 220 150"
            className={isHero ? "h-56 w-auto drop-shadow-md" : "h-32 w-auto drop-shadow-xs"}
            role="img"
            aria-label={name}
          >
            {/* Carry Handle */}
            <path d="M78 34 L78 22 L142 22 L142 34" fill="none" stroke="#0F172A" strokeWidth="5" strokeLinecap="round" />
            {/* Inverter Housing */}
            <rect x="46" y="34" width="128" height="86" rx="8" fill={arch.accent} stroke="#0F172A" strokeWidth="3" />
            <rect x="56" y="44" width="56" height="66" rx="4" fill="#1E293B" />
            {/* Digital Amperage LED Readout */}
            <rect x="122" y="48" width="40" height="20" rx="3" fill="#0F172A" />
            <text x="142" y="62" textAnchor="middle" fill="#10B981" fontSize="11" fontFamily="monospace" fontWeight="bold">160A</text>
            {/* Potentiometer & Dinse Terminals */}
            <circle cx="142" cy="84" r="9" fill="#0F172A" stroke="#F8FAFC" strokeWidth="2" />
            <circle cx="128" cy="106" r="6" fill="#DC2626" stroke="#0F172A" strokeWidth="2" />
            <circle cx="154" cy="106" r="6" fill="#0F172A" stroke="#F8FAFC" strokeWidth="2" />
          </svg>
        )}

        {arch.kind === "washer" && (
          <svg
            viewBox="0 0 220 150"
            className={isHero ? "h-56 w-auto drop-shadow-md" : "h-32 w-auto drop-shadow-xs"}
            role="img"
            aria-label={name}
          >
            {/* Telescopic Handle */}
            <path d="M86 30 L86 14 L126 14 L126 30" fill="none" stroke="#0F172A" strokeWidth="4" />
            {/* Vertical Pressure Washer Body */}
            <rect x="72" y="28" width="68" height="94" rx="10" fill={arch.accent} stroke="#0F172A" strokeWidth="3" />
            <rect x="84" y="44" width="44" height="42" rx="6" fill="#0F172A" />
            <circle cx="106" cy="65" r="12" fill="none" stroke="#10B981" strokeWidth="3" />
            {/* Wheels */}
            <circle cx="76" cy="122" r="14" fill="#1E293B" stroke="#0F172A" strokeWidth="3" />
            <circle cx="136" cy="122" r="14" fill="#1E293B" stroke="#0F172A" strokeWidth="3" />
            {/* High-Pressure Lance */}
            <path d="M148 34 L176 116" stroke="#0F172A" strokeWidth="4" strokeLinecap="round" />
            <path d="M176 116 L194 126" stroke="#38BDF8" strokeWidth="3" strokeDasharray="3 3" />
          </svg>
        )}

        {arch.kind === "meter" && (
          <svg
            viewBox="0 0 220 150"
            className={isHero ? "h-56 w-auto drop-shadow-md" : "h-32 w-auto drop-shadow-xs"}
            role="img"
            aria-label={name}
          >
            <rect x="74" y="18" width="72" height="114" rx="10" fill="#DC2626" stroke="#0F172A" strokeWidth="3" />
            <rect x="82" y="26" width="56" height="32" rx="4" fill="#DCFCE7" stroke="#0F172A" strokeWidth="2" />
            <text x="110" y="47" textAnchor="middle" fill="#064E3B" fontSize="13" fontFamily="monospace" fontWeight="bold">230.4V</text>
            <circle cx="110" cy="84" r="18" fill="#1E293B" stroke="#0F172A" strokeWidth="2.5" />
            <line x1="110" y1="84" x2="122" y2="74" stroke="#F8FAFC" strokeWidth="3" strokeLinecap="round" />
            <circle cx="92" cy="116" r="5" fill="#0F172A" />
            <circle cx="110" cy="116" r="5" fill="#0F172A" />
            <circle cx="128" cy="116" r="5" fill="#0F172A" />
          </svg>
        )}

        {(arch.kind === "hammer" ||
          arch.kind === "toolkit" ||
          arch.kind === "pump" ||
          arch.kind === "floodlight" ||
          arch.kind === "trimmer") && (
          <svg
            viewBox="0 0 220 150"
            className={isHero ? "h-56 w-auto drop-shadow-md" : "h-32 w-auto drop-shadow-xs"}
            role="img"
            aria-label={name}
          >
            {/* Heavy-Duty Moulded Case / Industrial Unit */}
            <rect x="86" y="20" width="48" height="14" rx="4" fill="none" stroke="#0F172A" strokeWidth="4" />
            <rect x="44" y="32" width="132" height="92" rx="10" fill="#1E293B" stroke="#0F172A" strokeWidth="3" />
            <rect x="56" y="44" width="108" height="68" rx="6" fill={arch.accent} opacity="0.9" />
            <rect x="74" y="64" width="72" height="28" rx="4" fill="#0F172A" />
            <text x="110" y="82" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontFamily="monospace" fontWeight="bold">
              {arch.code}
            </text>
            <rect x="68" y="30" width="16" height="8" rx="2" fill="#EA580C" />
            <rect x="136" y="30" width="16" height="8" rx="2" fill="#EA580C" />
          </svg>
        )}
      </div>

      {/* Bottom Technical Bar */}
      <div className="absolute bottom-2.5 left-3 right-3 z-10 flex items-center justify-between text-[11px]">
        <span className="font-mono font-semibold text-slate-600 tabular-nums">
          {sku ? `SKU: ${sku}` : "ORIGINALNO PAKOVANJE"}
        </span>
        {ownStockAvailable !== undefined && (
          <span
            className={`inline-flex items-center gap-1 rounded px-2 py-0.5 font-bold ${
              ownStockAvailable
                ? "bg-emerald-100 text-emerald-900"
                : "bg-slate-200/80 text-slate-800"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                ownStockAvailable ? "bg-emerald-600" : "bg-amber-600"
              }`}
            />
            {ownStockAvailable ? "Naš magacin (24-48h)" : "Lager dobavljača"}
          </span>
        )}
      </div>
    </div>
  );
}

export function ProductInteractiveGallery({
  slug,
  name,
  sku,
  brandName,
  shortSpec,
  ownStockAvailable,
}: ProductVisualProps) {
  const [activeTab, setActiveTab] = useState<"studio" | "specs" | "package">(
    "studio"
  );

  const specItems = (shortSpec || "")
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div className="space-y-3">
      {activeTab === "studio" && (
        <ProductVisual
          slug={slug}
          name={name}
          sku={sku}
          brandName={brandName}
          shortSpec={shortSpec}
          ownStockAvailable={ownStockAvailable}
          size="hero"
        />
      )}

      {activeTab === "specs" && (
        <div className="flex h-80 sm:h-96 flex-col justify-between rounded-xl border border-slate-200 bg-[#0F172A] p-6 text-white">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="font-bold text-sm text-emerald-400">
              Tehnička karta uređaja
            </span>
            <span className="font-mono text-xs text-slate-400 tabular-nums">
              {sku}
            </span>
          </div>
          <div className="my-auto grid gap-3 sm:grid-cols-2">
            {specItems.map((item, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-slate-800 bg-slate-900/90 p-3 text-xs"
              >
                <div className="text-slate-400">Karakteristika #{idx + 1}</div>
                <div className="mt-1 font-bold text-white">{item}</div>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-800 pt-3 text-[11px] text-slate-400">
            Svi tehnički podaci su provereni prema deklaraciji proizvođača i uvoznika za Republiku Srbiju.
          </div>
        </div>
      )}

      {activeTab === "package" && (
        <div className="flex h-80 sm:h-96 flex-col justify-between rounded-xl border border-emerald-200 bg-emerald-50/50 p-6 text-slate-900">
          <div>
            <h3 className="text-base font-extrabold text-[#064E3B]">
              Šta dobijate u paketu uz porudžbinu
            </h3>
            <ul className="mt-4 space-y-2.5 text-xs text-slate-700">
              <li className="flex items-center gap-2 font-semibold">
                <span className="h-2 w-2 rounded-full bg-emerald-600" />
                Originalno fabričko pakovanje: {name}
              </li>
              <li className="flex items-center gap-2 font-semibold">
                <span className="h-2 w-2 rounded-full bg-emerald-600" />
                Fiskalni račun sa QR kodom Poreske uprave RS (garantni list 24 meseca)
              </li>
              <li className="flex items-center gap-2 font-semibold">
                <span className="h-2 w-2 rounded-full bg-emerald-600" />
                Uputstvo za bezbednu upotrebu na srpskom jeziku
              </li>
              <li className="flex items-center gap-2 font-semibold">
                <span className="h-2 w-2 rounded-full bg-emerald-600" />
                Zakonsko pravo na zamenu ili povrat novca u roku od 14 dana
              </li>
            </ul>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-white p-3 text-xs text-slate-600">
            Svaki paket se fizički pregleda i zaštićeno pakuje pre predaje kurirskoj službi.
          </div>
        </div>
      )}

      {/* Thumbnail View Switcher */}
      <div className="grid grid-cols-3 gap-2.5">
        <button
          type="button"
          onClick={() => setActiveTab("studio")}
          className={`cursor-pointer rounded-lg border px-3 py-2 text-xs font-bold transition ${
            activeTab === "studio"
              ? "border-[#059669] bg-emerald-50 text-[#064E3B]"
              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
          }`}
        >
          1. Prikaz uređaja
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("specs")}
          className={`cursor-pointer rounded-lg border px-3 py-2 text-xs font-bold transition ${
            activeTab === "specs"
              ? "border-[#059669] bg-emerald-50 text-[#064E3B]"
              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
          }`}
        >
          2. Tehnička šema
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("package")}
          className={`cursor-pointer rounded-lg border px-3 py-2 text-xs font-bold transition ${
            activeTab === "package"
              ? "border-[#059669] bg-emerald-50 text-[#064E3B]"
              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
          }`}
        >
          3. Sadržaj paketa
        </button>
      </div>
    </div>
  );
}

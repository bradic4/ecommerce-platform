import React from "react";
import { STORE_CONFIG } from "@/lib/store-config";

type StockState = "own" | "supplier" | "unavailable";

function stateOf(ownStockAvailable: boolean, isOrderable: boolean): StockState {
  if (ownStockAvailable) return "own";
  return isOrderable ? "supplier" : "unavailable";
}

const COPY: Record<StockState, { title: string; dot: string; pill: string }> = {
  own: {
    title: "Naš lager • 1–2 dana",
    dot: "bg-stock-600",
    pill: "bg-stock-50 text-stock-700 border-stock-200",
  },
  supplier: {
    title: "Lager dobavljača • 2–5 dana",
    dot: "bg-brand-600",
    pill: "bg-brand-50 text-brand-700 border-brand-200",
  },
  unavailable: {
    title: "Trenutno nedostupno",
    dot: "bg-red-600",
    pill: "bg-red-50 text-red-700 border-red-200",
  },
};

/** Kompaktna oznaka za karticu proizvoda. Uvek tekst + tačka, nikad samo boja. */
export function StockPill({
  ownStockAvailable,
  isOrderable,
}: {
  ownStockAvailable: boolean;
  isOrderable: boolean;
}) {
  const st = stateOf(ownStockAvailable, isOrderable);
  const c = COPY[st];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold shadow-2xs ${c.pill}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} aria-hidden="true" />
      {c.title}
    </span>
  );
}

/** "Lager-metar" na stranici proizvoda: izvor + rok isporuke, iz stvarnog stanja u bazi. */
export function StockMeter({
  ownStockAvailable,
  isOrderable,
  statusLabel,
}: {
  ownStockAvailable: boolean;
  isOrderable: boolean;
  statusLabel?: string;
}) {
  const st = stateOf(ownStockAvailable, isOrderable);
  const c = COPY[st];
  const source =
    st === "own"
      ? "Naš magacin (Beograd)"
      : st === "supplier"
      ? "Centralni magacin dobavljača"
      : "—";
  const eta =
    st === "own"
      ? STORE_CONFIG.delivery.own
      : st === "supplier"
      ? STORE_CONFIG.delivery.supplier
      : "Nije moguće poručiti";

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5">
        <span className={`h-2.5 w-2.5 rounded-full ${c.dot}`} aria-hidden="true" />
        <span className="text-sm font-bold text-brand-700">{c.title}</span>
        {statusLabel && (
          <span className="ml-auto text-xs text-slate-500">{statusLabel}</span>
        )}
      </div>
      <dl className="grid grid-cols-2 divide-x divide-slate-100 text-xs">
        <div className="px-4 py-2.5">
          <dt className="text-slate-500">Izvor isporuke</dt>
          <dd className="mt-0.5 font-bold text-brand-700">{source}</dd>
        </div>
        <div className="px-4 py-2.5">
          <dt className="text-slate-500">Očekivani rok</dt>
          <dd className="mt-0.5 font-bold text-brand-700">{eta}</dd>
        </div>
      </dl>
    </div>
  );
}

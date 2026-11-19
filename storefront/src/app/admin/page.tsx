"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { NaLageruMark } from "@/components/Logo";
import { formatRsd } from "@/lib/api";
import { STORE_CONFIG } from "@/lib/store-config";
import {
  INITIAL_TRAINING_DB,
  loadTrainingDb,
  resetTrainingDb,
  saveTrainingDb,
  TrainingDatabase,
  TrainingOrderRecord,
  TrainingProductRecord,
} from "@/lib/training-store";

type AdminTab =
  | "guide"
  | "orders"
  | "catalog"
  | "suppliers"
  | "pricing"
  | "rma";

interface DryRunPreviewRow {
  sku: string;
  name: string;
  rawCost: number;
  costWithVat: number;
  recommendedSellingPrice: number;
  supplierStock: number;
  ean: string;
  categoryName: string;
  action: "UPDATE" | "NEW" | "PRICE_ALERT";
  priceDiffPct: number;
}

const DEFAULT_SAMPLE_CSV = `SifraArtikla;NazivProizvoda;VpCenaBezPdv;StanjeLager;BarkodEAN;Grupa
NL-GAN-65W;GaN Pro 65W Brzi Punjač USB-C PD 3.0 (3 porta, PPS);1950;52;8606019841010;Tehnika i elektronika
NL-UPS-1000LCD;Line-Interactive UPS 1000VA / 600W sa AVR stabilizacijom;5150;24;8606019841041;Tehnika i elektronika
NL-SSD-1TB;NVMe M.2 SSD 1TB PCIe 4.0 (7000 MB/s čitanje, Heatsink);6400;19;8606019841096;Tehnika i elektronika`;

export default function OperationalAdminPage() {
  const [db, setDb] = useState<TrainingDatabase>(INITIAL_TRAINING_DB);
  const [hydrated, setHydrated] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>("guide");
  const [toast, setToast] = useState<string | null>(null);

  // Training checklist state
  const [completedTasks, setCompletedTasks] = useState<number[]>([]);

  // Orders tab state
  const [orderFilter, setOrderFilter] = useState<string>("ALL");
  const [dispatchInputs, setDispatchInputs] = useState<
    Record<string, { courier: string; tracking: string; pfr: string }>
  >({});
  const [printingOrder, setPrintingOrder] =
    useState<TrainingOrderRecord | null>(null);

  // Catalog tab — New Product Form
  const [newProdName, setNewProdName] = useState("");
  const [newProdSku, setNewProdSku] = useState("");
  const [newProdEan, setNewProdEan] = useState("8606019841102");
  const [newProdBrand, setNewProdBrand] = useState("VoltCore");
  const [newProdCategory, setNewProdCategory] = useState(
    "tehnika-i-elektronika"
  );
  const [newProdSpec, setNewProdSpec] = useState(
    "USB-C PD 3.0 • Metalno kućište • 24m garancije"
  );
  const [newProdCost, setNewProdCost] = useState(2800);
  const [newProdPrice, setNewProdPrice] = useState(4490);
  const [newProdOwnStock, setNewProdOwnStock] = useState(5);
  const [newProdSupplierStock, setNewProdSupplierStock] = useState(15);

  // Supplier CSV Dry-Run state
  const [selectedSupplierId, setSelectedSupplierId] = useState("sup-1");
  const [feedPricesIncludeVat, setFeedPricesIncludeVat] = useState(false);
  const [csvText, setCsvText] = useState(DEFAULT_SAMPLE_CSV);
  const [dryRunRows, setDryRunRows] = useState<DryRunPreviewRow[] | null>(null);

  // Pricing Calculator state
  const [simCostWithVat, setSimCostWithVat] = useState(5000);
  const [simTargetMarginPct, setSimTargetMarginPct] = useState(28);
  const [simUnclaimedRatePct, setSimUnclaimedRatePct] = useState(3.5);
  const [simReturnShippingRsd, setSimReturnShippingRsd] = useState(850);

  // New Coupon state
  const [newCouponCode, setNewCouponCode] = useState("");
  const [newCouponPct, setNewCouponPct] = useState(10);
  const [newCouponMinSubtotal, setNewCouponMinSubtotal] = useState(4000);

  // RMA response inputs
  const [rmaNotes, setRmaNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    const loaded = loadTrainingDb();
    setDb(loaded);
    setHydrated(true);
  }, []);

  const showNotification = (msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast((prev) => (prev === msg ? null : prev));
    }, 4500);
  };

  const updateDatabase = (updater: (draft: TrainingDatabase) => void) => {
    setDb((prev) => {
      const clone = JSON.parse(JSON.stringify(prev)) as TrainingDatabase;
      updater(clone);
      saveTrainingDb(clone);
      return clone;
    });
  };

  const markTaskComplete = (taskNum: number) => {
    setCompletedTasks((prev) =>
      prev.includes(taskNum) ? prev : [...prev, taskNum]
    );
  };

  const handleResetTraining = () => {
    const fresh = resetTrainingDb();
    setDb(fresh);
    setDryRunRows(null);
    setCompletedTasks([]);
    showNotification(
      "Svi podaci za vežbanje su vraćeni na početno stanje! Možete ponoviti obuku od početka."
    );
  };

  // Order operations
  const handleConfirmOrder = (orderId: string) => {
    updateDatabase((draft) => {
      const ord = draft.orders.find((o) => o.id === orderId);
      if (ord) {
        ord.status = "Confirmed";
      }
    });
    markTaskComplete(1);
    showNotification(
      "Porudžbina je potvrđena i prebačena u listu za pakovanje."
    );
  };

  const handleDispatchOrder = (orderId: string) => {
    const inputs = dispatchInputs[orderId] || {
      courier: "PostExpress",
      tracking: `PE${Math.floor(100000000 + Math.random() * 899999999)}RS`,
      pfr: `PFR-2026-${Math.floor(10000 + Math.random() * 89999)}`,
    };

    updateDatabase((draft) => {
      const ord = draft.orders.find((o) => o.id === orderId);
      if (ord) {
        ord.status = "Dispatched";
        ord.courierName = inputs.courier || "PostExpress";
        ord.trackingNumber = inputs.tracking || "PE991122334RS";
        ord.fiscalInvoiceNumber = inputs.pfr || "PFR-2026-99112";

        // Deduct physical own stock for OwnStock items
        for (const item of ord.items) {
          if (item.fulfillmentSource === "OwnStock") {
            const prod = draft.products.find(
              (p) => p.variantId === item.variantId || p.sku === item.sku
            );
            if (prod) {
              prod.ownStockQty = Math.max(0, prod.ownStockQty - item.quantity);
              prod.reservedOwnStockQty = Math.max(
                0,
                prod.reservedOwnStockQty - item.quantity
              );
            }
          }
        }
      }
    });
    markTaskComplete(1);
    showNotification(
      `Pošiljka označena kao poslata (${inputs.courier} / ${inputs.tracking}). Stanje magacina je ažurirano.`
    );
  };

  const handleMarkOrderPaid = (orderId: string) => {
    updateDatabase((draft) => {
      const ord = draft.orders.find((o) => o.id === orderId);
      if (ord) {
        ord.status = "DeliveredPaid";
      }
    });
    showNotification("Otkupnina (pouzeće) je evidentirana kao naplaćena.");
  };

  const handleMarkOrderUnclaimed = (orderId: string) => {
    updateDatabase((draft) => {
      const ord = draft.orders.find((o) => o.id === orderId);
      if (ord) {
        ord.status = "ReturnedUnclaimed";
        // Return items back to own stock
        for (const item of ord.items) {
          const prod = draft.products.find(
            (p) => p.variantId === item.variantId || p.sku === item.sku
          );
          if (prod) {
            prod.ownStockQty += item.quantity;
          }
        }
      }
    });
    showNotification(
      "Paket označen kao vraćen/nepreuzet — artikli su vraćeni na stanje našeg magacina."
    );
  };

  const handleExportCourierCsv = () => {
    const readyOrders = db.orders.filter(
      (o) => o.status === "Confirmed" || o.status === "Dispatched"
    );
    const header =
      "BrojPorudzbine;Primalac;Telefon;Ulica;Grad;PostanskiBroj;OtkupninaRSD;Napomena\n";
    const rows = readyOrders
      .map(
        (o) =>
          `${o.orderNumber};"${o.customerFullName}";"${o.customerPhone}";"${o.streetAndNumber}";"${o.city}";"${o.postalCode}";${o.paymentMethod === "CashOnDelivery" ? o.totalRsd : 0};"${o.deliveryNotes || ""}"`
      )
      .join("\n");

    const blob = new Blob([header + rows], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kurir-manifest-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification(
      `Izvezen CSV manifest za kurirsku službu (${readyOrders.length} pošiljki).`
    );
  };

  // Catalog operations
  const handleQuickStockPriceChange = (
    prodId: string,
    field: "ownStockQty" | "supplierStockQty" | "costPriceRsd" | "priceRsd",
    value: number
  ) => {
    updateDatabase((draft) => {
      const p = draft.products.find((x) => x.id === prodId);
      if (p) {
        p[field] = Math.max(0, Math.round(value));
      }
    });
    markTaskComplete(2);
  };

  const handleAddNewProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim() || !newProdSku.trim()) return;

    const catObj =
      db.categories.find((c) => c.slug === newProdCategory) || db.categories[0];
    const slug = newProdName
      .toLowerCase()
      .replace(/[čć]/g, "c")
      .replace(/đ/g, "dj")
      .replace(/š/g, "s")
      .replace(/ž/g, "z")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const newRec: TrainingProductRecord = {
      id: `prod-${Date.now()}`,
      variantId: `var-${Date.now()}`,
      name: newProdName.trim(),
      slug: `${slug}-${Date.now().toString().slice(-3)}`,
      sku: newProdSku.trim().toUpperCase(),
      ean: newProdEan.trim() || "8606019841999",
      brandName: newProdBrand.trim() || "NaLageru",
      brandSlug: (newProdBrand.trim() || "nalageru").toLowerCase(),
      categoryName: catObj.name,
      categorySlug: catObj.slug,
      shortSpecification: newProdSpec.trim(),
      description: `${newProdName.trim()} (${newProdSpec.trim()}). Isporučuje se uz fiskalni račun i 24 meseca zakonske saobraznosti.`,
      costPriceRsd: Number(newProdCost) || 2000,
      priceRsd: Number(newProdPrice) || 3490,
      ownStockQty: Number(newProdOwnStock) || 0,
      reservedOwnStockQty: 0,
      supplierStockQty: Number(newProdSupplierStock) || 0,
      supplierLeadTimeDays: 3,
      supplierName: "Direktni unos (Admin)",
    };

    updateDatabase((draft) => {
      draft.products.unshift(newRec);
    });
    markTaskComplete(2);
    setNewProdName("");
    setNewProdSku("");
    showNotification(
      `Novi artikal "${newRec.name}" (${newRec.sku}) je dodat u katalog i odmah je vidljiv u prodavnici!`
    );
  };

  // Supplier CSV Dry-Run & Apply
  const handleRunDryRun = () => {
    const lines = csvText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length < 2) {
      showNotification("CSV mora imati zaglavlje i bar jedan red sa artiklom.");
      return;
    }

    const preview: DryRunPreviewRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(";");
      if (cols.length < 4) continue;
      const sku = cols[0].trim();
      const name = cols[1].trim();
      const rawCost = Number(cols[2].trim()) || 0;
      const stock = Number(cols[3].trim()) || 0;
      const ean = (cols[4] || "8606019841000").trim();
      const categoryName = (cols[5] || "Tehnika i elektronika").trim();

      const costWithVat = feedPricesIncludeVat
        ? Math.round(rawCost)
        : Math.round(rawCost * 1.2);

      // Psychological rounding to -90 RSD with ~28% gross margin
      const rawSelling = costWithVat / (1 - 0.28);
      const recommendedSellingPrice = Math.ceil(rawSelling / 100) * 100 - 10;

      const existing = db.products.find(
        (p) => p.sku.toUpperCase() === sku.toUpperCase()
      );
      let action: "UPDATE" | "NEW" | "PRICE_ALERT" = existing
        ? "UPDATE"
        : "NEW";
      let priceDiffPct = 0;
      if (existing && existing.costPriceRsd > 0) {
        priceDiffPct = Math.round(
          ((costWithVat - existing.costPriceRsd) / existing.costPriceRsd) * 100
        );
        if (Math.abs(priceDiffPct) >= 30) {
          action = "PRICE_ALERT";
        }
      }

      preview.push({
        sku,
        name,
        rawCost,
        costWithVat,
        recommendedSellingPrice,
        supplierStock: stock,
        ean,
        categoryName,
        action,
        priceDiffPct,
      });
    }

    setDryRunRows(preview);
    markTaskComplete(3);
    showNotification(
      `Dry-Run analiza završena: obrađeno ${preview.length} redova (${feedPricesIncludeVat ? "cene sa PDV-om" : "automatski dodat +20% PDV"}).`
    );
  };

  const handleApplyCsvImport = () => {
    if (!dryRunRows || dryRunRows.length === 0) return;

    updateDatabase((draft) => {
      for (const row of dryRunRows) {
        const existing = draft.products.find(
          (p) => p.sku.toUpperCase() === row.sku.toUpperCase()
        );
        if (existing) {
          existing.costPriceRsd = row.costWithVat;
          existing.supplierStockQty = row.supplierStock;
          existing.priceRsd = row.recommendedSellingPrice;
        } else {
          const slug = row.name
            .toLowerCase()
            .replace(/[čć]/g, "c")
            .replace(/đ/g, "dj")
            .replace(/š/g, "s")
            .replace(/ž/g, "z")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "");

          draft.products.unshift({
            id: `prod-imp-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
            variantId: `var-imp-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
            name: row.name,
            slug,
            sku: row.sku,
            ean: row.ean,
            brandName: "VoltCore",
            brandSlug: "voltcore",
            categoryName: row.categoryName,
            categorySlug: "tehnika-i-elektronika",
            shortSpecification:
              "Uvezeno iz CSV cenovnika dobavljača • 24m garancije",
            description: `${row.name} — artikal uvezen iz feed-a dobavljača sa automatski obračunatim PDV-om i maloprodajnom maržom.`,
            costPriceRsd: row.costWithVat,
            priceRsd: row.recommendedSellingPrice,
            ownStockQty: 0,
            reservedOwnStockQty: 0,
            supplierStockQty: row.supplierStock,
            supplierLeadTimeDays: 3,
            supplierName: "EWE Comp Beograd",
          });
        }
      }

      const sup = draft.suppliers.find((s) => s.id === selectedSupplierId);
      if (sup) {
        sup.lastSyncAt = new Date().toLocaleString("sr-RS");
      }
    });

    markTaskComplete(3);
    showNotification(
      `Uvoz uspešno primenjen! Ažurirano/dodato ${dryRunRows.length} artikala u katalog.`
    );
    setDryRunRows(null);
  };

  // Coupon creation
  const handleAddCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newCouponCode.trim().toUpperCase();
    if (!clean) return;

    updateDatabase((draft) => {
      draft.coupons.push({
        id: `cup-${Date.now()}`,
        code: clean,
        description: `${newCouponPct}% popusta za porudžbine preko ${newCouponMinSubtotal} RSD`,
        discountPercent: Number(newCouponPct) || 10,
        minOrderSubtotalRsd: Number(newCouponMinSubtotal) || 3000,
        minAllowedMarginAfterDiscountPct: 14,
        isActive: true,
        usedCount: 0,
      });
    });
    markTaskComplete(4);
    setNewCouponCode("");
    showNotification(`Novi promo kupon "${clean}" je aktiviran.`);
  };

  // RMA actions
  const handleRmaAnswer = (
    rmaId: string,
    newStatus: "AnsweredWithin8Days" | "ResolvedRestocked" | "Rejected"
  ) => {
    const noteText =
      rmaNotes[rmaId] ||
      "Zahtev je obrađen u zakonskom roku od 8 dana. Kupac je obavešten elektronskom poštom.";

    updateDatabase((draft) => {
      const rma = draft.rmas.find((r) => r.id === rmaId);
      if (rma) {
        rma.status = newStatus;
        rma.adminResponseNote = noteText;

        if (newStatus === "ResolvedRestocked") {
          const prod = draft.products.find(
            (p) => p.sku.toUpperCase() === rma.productSku.toUpperCase()
          );
          if (prod) {
            prod.ownStockQty += 1;
          }
        }
      }
    });
    markTaskComplete(5);
    showNotification(
      newStatus === "ResolvedRestocked"
        ? "Reklamacija rešena i artikal (+1 kom) vraćen na stanje našeg magacina."
        : "Zvaničan zakonski odgovor (8 dana) je sačuvan i poslat kupcu."
    );
  };

  // Margin Calculator math
  const expectedCodLossPerOrderRsd = Math.round(
    (simUnclaimedRatePct / 100) * simReturnShippingRsd
  );
  const effectiveCostRsd = simCostWithVat + expectedCodLossPerOrderRsd;
  const rawRecommendedSelling =
    effectiveCostRsd / Math.max(0.1, 1 - simTargetMarginPct / 100);
  const roundedSellingRsd = Math.ceil(rawRecommendedSelling / 100) * 100 - 10;
  const netProfitPerOrderRsd = roundedSellingRsd - effectiveCostRsd;
  const actualGrossMarginPct = (
    ((roundedSellingRsd - simCostWithVat) / roundedSellingRsd) *
    100
  ).toFixed(1);

  // KPI Metrics
  const pendingOrdersCount = db.orders.filter(
    (o) => o.status === "PendingConfirmation"
  ).length;
  const readyToPackCount = db.orders.filter(
    (o) => o.status === "Confirmed"
  ).length;
  const ownStockSkusCount = db.products.filter(
    (p) => p.ownStockQty - p.reservedOwnStockQty > 0
  ).length;
  const openRmasCount = db.rmas.filter((r) => r.status === "Received").length;

  const filteredOrders =
    orderFilter === "ALL"
      ? db.orders
      : db.orders.filter((o) => o.status === orderFilter);

  if (!hydrated) {
    return (
      <div className="py-12 text-center text-sm text-slate-600">
        Učitavanje NaLageru Operativnog Admin centra...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Admin Header Banner */}
      <section className="rounded-2xl border border-brand-800 bg-brand-700 p-5 sm:p-6 text-white shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <NaLageruMark className="h-11 w-11 shrink-0" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">
                  NaLageru.rs — Operativni Admin Centar
                </h1>
                <span className="rounded-full bg-accent-400 px-2.5 py-0.5 text-[11px] font-extrabold text-brand-800">
                  TRENING &amp; OPERATIVNI REŽIM
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-300">
                Upravljanje porudžbinama, štampa otpremnica, hibridni lager (naš
                magacin + dobavljači), CSV uvoz i RMA evidencija.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <a
              href="/NaLageru-Uputstvo-za-Koriscenje.pdf"
              target="_blank"
              rel="noopener noreferrer"
              download="NaLageru-Uputstvo-za-Koriscenje.pdf"
              className="rounded-xl border border-slate-400/50 bg-brand-800 px-3.5 py-2 text-xs font-bold text-white hover:border-accent-400 hover:text-accent-400 transition"
            >
              📄 Preuzmi PDF uputstvo
            </a>
            <button
              type="button"
              onClick={handleResetTraining}
              className="cursor-pointer rounded-xl border border-accent-400/50 bg-brand-800 px-3.5 py-2 text-xs font-bold text-accent-400 hover:bg-brand-600 transition"
            >
              ↺ Resetuj podatke za vežbanje
            </button>
            <Link
              href="/"
              className="rounded-xl bg-accent-400 px-4 py-2 text-xs font-extrabold text-brand-800 hover:bg-accent-300 transition"
            >
              Pogledaj izlog prodavnice &rarr;
            </Link>
          </div>
        </div>

        {/* 4 Operational KPI Cards */}
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <button
            type="button"
            onClick={() => {
              setActiveTab("orders");
              setOrderFilter("PendingConfirmation");
            }}
            className="cursor-pointer rounded-xl border border-brand-600 bg-brand-800/90 p-3.5 text-left hover:border-accent-400 transition"
          >
            <div className="text-[11px] font-semibold text-slate-300">
              1. Nove porudžbine (čekaju potvrdu)
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-accent-400 tabular-nums">
                {pendingOrdersCount}
              </span>
              <span className="text-[11px] text-slate-300">
                Klikni za obradu &rarr;
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("orders");
              setOrderFilter("Confirmed");
            }}
            className="cursor-pointer rounded-xl border border-brand-600 bg-brand-800/90 p-3.5 text-left hover:border-accent-400 transition"
          >
            <div className="text-[11px] font-semibold text-slate-300">
              2. Spremno za pakovanje i kurira
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-white tabular-nums">
                {readyToPackCount}
              </span>
              <span className="text-[11px] text-slate-300">
                Štampa otpremnice &rarr;
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("catalog")}
            className="cursor-pointer rounded-xl border border-brand-600 bg-brand-800/90 p-3.5 text-left hover:border-accent-400 transition"
          >
            <div className="text-[11px] font-semibold text-slate-300">
              3. Artikli na našem lageru / ukupno
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-accent-400 tabular-nums">
                {ownStockSkusCount} / {db.products.length}
              </span>
              <span className="text-[11px] text-slate-300">
                Izmeni stanje &rarr;
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("rma")}
            className="cursor-pointer rounded-xl border border-brand-600 bg-brand-800/90 p-3.5 text-left hover:border-accent-400 transition"
          >
            <div className="text-[11px] font-semibold text-slate-300">
              4. Aktivne reklamacije (rok 8 dana)
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-white tabular-nums">
                {openRmasCount}
              </span>
              <span className="text-[11px] text-slate-300">
                RMA evidencija &rarr;
              </span>
            </div>
          </button>
        </div>
      </section>

      {toast && (
        <div
          role="status"
          className="rounded-xl border border-stock-100 bg-stock-50 px-4 py-3 text-xs font-bold text-stock-700 shadow-xs flex items-center justify-between"
        >
          <span>✓ {toast}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="cursor-pointer text-stock-700 underline ml-4"
          >
            Zatvori
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <nav className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {[
          {
            id: "guide" as AdminTab,
            label: `1. Priručnik za obuku (${completedTasks.length}/5)`,
          },
          {
            id: "orders" as AdminTab,
            label: `2. Porudžbine & Otprema (${db.orders.length})`,
          },
          {
            id: "catalog" as AdminTab,
            label: `3. Katalog & Lager (${db.products.length})`,
          },
          {
            id: "suppliers" as AdminTab,
            label: "4. Dobavljači & CSV Uvoz",
          },
          {
            id: "pricing" as AdminTab,
            label: "5. Marže & Kuponi",
          },
          {
            id: "rma" as AdminTab,
            label: `6. Reklamacije RMA (${db.rmas.length})`,
          },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`cursor-pointer rounded-xl px-4 py-2.5 text-xs font-extrabold transition ${
              activeTab === tab.id
                ? "bg-brand-700 text-accent-400 shadow-xs"
                : "border border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:text-brand-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* TAB 1: PRIRUČNIK ZA OBUKU (5 ZADATAKA ZA OCA) */}
      {activeTab === "guide" && (
        <section className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <span className="inline-block rounded-md bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700">
              Vodič za obuku operatera (Sandbox okruženje)
            </span>
            <h2 className="mt-2 text-xl font-extrabold text-brand-700">
              5 praktičnih koraka za svakodnevno vođenje prodavnice NaLageru.rs
            </h2>
            <p className="mt-1 text-xs text-slate-600 leading-relaxed">
              Sve promene koje napravite ovde čuvaju se lokalno u vašem
              pregledaču i odmah se vide u prodavnici. U svakom trenutku možete
              kliknuti na dugme{" "}
              <strong>„Resetuj podatke za vežbanje“</strong> u gornjem desnom
              uglu da vratite sve na početak.
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {[
                {
                  num: 1,
                  title:
                    "Zadatak 1: Potvrda porudžbine, unos kurira i štampa otpremnice",
                  desc: "Otvorite tab 'Porudžbine & Otprema'. Pronađite novu porudžbinu ORD-20261119-001 (Marko Petrović), kliknite '1. Potvrdi porudžbinu', zatim unesite broj pošiljke i kliknite 'Štampaj A4 Otpremnicu + 14d Obrazac'.",
                  targetTab: "orders" as AdminTab,
                  btnLabel: "Otvori Porudžbine & Otpremu",
                },
                {
                  num: 2,
                  title:
                    "Zadatak 2: Promena stanja u našem magacinu i dodavanje artikla",
                  desc: "Otvorite tab 'Katalog & Lager'. Za 27\" QHD Monitor promenite 'Naš magacin' sa 0 na 4 komada — artikal će na sajtu automatski preći sa žute oznake 'Lager dobavljača (2–5 dana)' na zelenu 'Naš lager (1–2 dana)'.",
                  targetTab: "catalog" as AdminTab,
                  btnLabel: "Otvori Katalog & Lager",
                },
                {
                  num: 3,
                  title:
                    "Zadatak 3: Uvoz CSV cenovnika dobavljača (Dry-Run provera + PDV)",
                  desc: "Otvorite tab 'Dobavljači & CSV Uvoz'. Kliknite '1. Pokreni Dry-Run proveru' da vidite kako sistem automatski dodaje +20% PDV na veleprodajne cene i računa preporučenu maloprodajnu cenu, pa kliknite '2. Primeni uvoz'.",
                  targetTab: "suppliers" as AdminTab,
                  btnLabel: "Otvori CSV Uvoz Dobavljača",
                },
                {
                  num: 4,
                  title:
                    "Zadatak 4: Kalkulator marže sa troškom nepreuzetih paketa",
                  desc: "Otvorite tab 'Marže & Kuponi'. Unesite nabavnu cenu artikla i pogledajte kako procenat nepreuzetih pouzeća (3.5%) utiče na stvarnu zaradu, ili kreirajte novi promo kupon.",
                  targetTab: "pricing" as AdminTab,
                  btnLabel: "Otvori Marže & Kupone",
                },
                {
                  num: 5,
                  title:
                    "Zadatak 5: Odgovor na reklamaciju u zakonskom roku od 8 dana",
                  desc: "Otvorite tab 'Reklamacije RMA'. Pronađite zahtev RMA-2026-004 (Milan Kovačević), unesite odgovor trgovca i kliknite 'Uvaži i vrati na naš lager (+1 kom)'.",
                  targetTab: "rma" as AdminTab,
                  btnLabel: "Otvori Reklamacije (RMA)",
                },
              ].map((task) => {
                const isDone = completedTasks.includes(task.num);
                return (
                  <div
                    key={task.num}
                    className={`flex flex-col justify-between rounded-xl border p-4 transition ${
                      isDone
                        ? "border-stock-200 bg-stock-50/60"
                        : "border-slate-200 bg-slate-50/70"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-brand-700">
                          <input
                            type="checkbox"
                            checked={isDone}
                            onChange={() =>
                              setCompletedTasks((prev) =>
                                prev.includes(task.num)
                                  ? prev.filter((x) => x !== task.num)
                                  : [...prev, task.num]
                              )
                            }
                            className="h-4 w-4 rounded border-slate-300"
                          />
                          <span>{task.title}</span>
                        </span>
                        {isDone && (
                          <span className="rounded bg-stock-600 px-2 py-0.5 text-[10px] font-bold text-white">
                            URAĐENO
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                        {task.desc}
                      </p>
                    </div>
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={() => setActiveTab(task.targetTab)}
                        className="cursor-pointer rounded-lg bg-brand-700 px-3.5 py-2 text-xs font-bold text-white hover:bg-brand-600 transition"
                      >
                        {task.btnLabel} &rarr;
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* TAB 2: PORUDŽBINE, OTPREMA & ŠTAMPA OTPREMNICE */}
      {activeTab === "orders" && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {[
                { id: "ALL", label: `Sve (${db.orders.length})` },
                {
                  id: "PendingConfirmation",
                  label: `Čeka potvrdu (${pendingOrdersCount})`,
                },
                {
                  id: "Confirmed",
                  label: `Za pakovanje (${readyToPackCount})`,
                },
                { id: "Dispatched", label: "Poslato kurirom" },
                { id: "DeliveredPaid", label: "Isporučeno / Naplaćeno" },
                { id: "ReturnedUnclaimed", label: "Vraćeno (Nepreuzeto)" },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setOrderFilter(f.id)}
                  className={`cursor-pointer rounded-lg px-3 py-1.5 font-bold transition ${
                    orderFilter === f.id
                      ? "bg-brand-700 text-white"
                      : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleExportCourierCsv}
              className="cursor-pointer rounded-xl bg-accent-400 px-4 py-2 text-xs font-extrabold text-brand-800 hover:bg-accent-300 transition"
            >
              ⬇ Preuzmi CSV manifest za kurirsku službu (PostExpress / BEX)
            </button>
          </div>

          <div className="space-y-4">
            {filteredOrders.map((ord) => {
              const dInput = dispatchInputs[ord.id] || {
                courier: ord.courierName || "PostExpress",
                tracking: ord.trackingNumber || "PE984512001RS",
                pfr: ord.fiscalInvoiceNumber || "PFR-2026-44102",
              };

              return (
                <article
                  key={ord.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-base font-extrabold text-brand-700">
                          {ord.orderNumber}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                            ord.status === "PendingConfirmation"
                              ? "bg-amber-100 text-amber-900"
                              : ord.status === "Confirmed"
                                ? "bg-brand-100 text-brand-800"
                                : ord.status === "Dispatched"
                                  ? "bg-blue-100 text-blue-900"
                                  : ord.status === "DeliveredPaid"
                                    ? "bg-stock-100 text-stock-700"
                                    : "bg-red-100 text-red-800"
                          }`}
                        >
                          {ord.status === "PendingConfirmation" &&
                            "ČEKA POTVRDU OPERATERA"}
                          {ord.status === "Confirmed" &&
                            "POTVRĐENO — SPREMNO ZA PAKOVANJE"}
                          {ord.status === "Dispatched" &&
                            `POSLATO (${ord.courierName}: ${ord.trackingNumber})`}
                          {ord.status === "DeliveredPaid" &&
                            "ISPORUČENO I NAPLAĆENO"}
                          {ord.status === "ReturnedUnclaimed" &&
                            "VRAĆENO — NEPREUZET PAKET"}
                        </span>
                        <span
                          className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                            ord.riskLevel === "Low"
                              ? "bg-stock-50 text-stock-700 border border-stock-100"
                              : "bg-amber-50 text-amber-800 border border-amber-200"
                          }`}
                        >
                          Anti-Fraud Rizik: {ord.riskLevel}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        Kupac:{" "}
                        <strong className="text-slate-800">
                          {ord.customerFullName}
                        </strong>{" "}
                        • Telefon:{" "}
                        <strong className="text-brand-700 tabular-nums">
                          {ord.customerPhone}
                        </strong>{" "}
                        • Adresa:{" "}
                        <strong className="text-slate-800">
                          {ord.streetAndNumber}, {ord.postalCode} {ord.city}
                        </strong>
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-500">
                        {ord.riskNote}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-lg font-extrabold text-brand-700 tabular-nums">
                        {formatRsd(ord.totalRsd)}
                      </div>
                      <div className="text-[11px] font-semibold text-slate-500">
                        {ord.paymentMethod === "CashOnDelivery"
                          ? "Pouzeće (naplata kuriru)"
                          : "NBS IPS QR uplata na račun"}
                      </div>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500">
                          <th className="py-1.5">Šifra (SKU)</th>
                          <th className="py-1.5">Artikal</th>
                          <th className="py-1.5">Izvor robe</th>
                          <th className="py-1.5 text-right">Kol.</th>
                          <th className="py-1.5 text-right">Nabavna</th>
                          <th className="py-1.5 text-right">Prodajna</th>
                          <th className="py-1.5 text-right">Bruto razlika</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {ord.items.map((item, idx) => (
                          <tr key={idx}>
                            <td className="py-2 font-mono font-bold text-brand-700">
                              {item.sku}
                            </td>
                            <td className="py-2 font-semibold text-slate-800">
                              {item.productName}
                            </td>
                            <td className="py-2">
                              <span
                                className={`rounded px-2 py-0.5 text-[11px] font-bold ${
                                  item.fulfillmentSource === "OwnStock"
                                    ? "bg-stock-50 text-stock-700 border border-stock-100"
                                    : "bg-amber-50 text-amber-900 border border-amber-200"
                                }`}
                              >
                                {item.fulfillmentSource === "OwnStock"
                                  ? "Naš magacin (1–2d)"
                                  : "Lager dobavljača (2–5d)"}
                              </span>
                            </td>
                            <td className="py-2 text-right font-bold tabular-nums">
                              {item.quantity}
                            </td>
                            <td className="py-2 text-right text-slate-500 tabular-nums">
                              {formatRsd(item.unitCostRsd * item.quantity)}
                            </td>
                            <td className="py-2 text-right font-bold text-brand-700 tabular-nums">
                              {formatRsd(item.lineTotalRsd)}
                            </td>
                            <td className="py-2 text-right font-bold text-stock-600 tabular-nums">
                              +
                              {formatRsd(
                                item.lineTotalRsd -
                                  item.unitCostRsd * item.quantity
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Operator Controls */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 p-3.5 rounded-xl text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={dInput.courier}
                        onChange={(e) =>
                          setDispatchInputs({
                            ...dispatchInputs,
                            [ord.id]: { ...dInput, courier: e.target.value },
                          })
                        }
                        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-semibold"
                      >
                        <option value="PostExpress">PostExpress</option>
                        <option value="BEX">BEX Kurir</option>
                        <option value="D Express">D Express</option>
                        <option value="AKS">AKS Express</option>
                      </select>

                      <input
                        type="text"
                        value={dInput.tracking}
                        onChange={(e) =>
                          setDispatchInputs({
                            ...dispatchInputs,
                            [ord.id]: { ...dInput, tracking: e.target.value },
                          })
                        }
                        placeholder="Broj pošiljke (tracking)"
                        className="w-40 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono"
                      />

                      <input
                        type="text"
                        value={dInput.pfr}
                        onChange={(e) =>
                          setDispatchInputs({
                            ...dispatchInputs,
                            [ord.id]: { ...dInput, pfr: e.target.value },
                          })
                        }
                        placeholder="Broj PFR fiskalnog računa"
                        className="w-44 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {ord.status === "PendingConfirmation" && (
                        <button
                          type="button"
                          onClick={() => handleConfirmOrder(ord.id)}
                          className="cursor-pointer rounded-lg bg-brand-700 px-3.5 py-2 font-extrabold text-accent-400 hover:bg-brand-600 transition"
                        >
                          1. Potvrdi porudžbinu
                        </button>
                      )}

                      {(ord.status === "PendingConfirmation" ||
                        ord.status === "Confirmed") && (
                        <button
                          type="button"
                          onClick={() => handleDispatchOrder(ord.id)}
                          className="cursor-pointer rounded-lg bg-stock-600 px-3.5 py-2 font-extrabold text-white hover:bg-stock-700 transition"
                        >
                          2. Otpremi paket i razduži lager
                        </button>
                      )}

                      {ord.status === "Dispatched" && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleMarkOrderPaid(ord.id)}
                            className="cursor-pointer rounded-lg bg-stock-600 px-3 py-1.5 font-bold text-white hover:bg-stock-700"
                          >
                            ✓ Evidentiraj uplatu pouzeća
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMarkOrderUnclaimed(ord.id)}
                            className="cursor-pointer rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 font-bold text-red-700 hover:bg-red-100"
                          >
                            ✕ Paket vraćen (Nepreuzet)
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setPrintingOrder(ord);
                          markTaskComplete(1);
                        }}
                        className="cursor-pointer rounded-lg border border-brand-700 bg-white px-3.5 py-2 font-extrabold text-brand-700 hover:bg-brand-50 transition"
                      >
                        🖨 Štampaj A4 Otpremnicu + 14d Obrazac
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* TAB 3: KATALOG, CENE & HIBRIDNI LAGER */}
      {activeTab === "catalog" && (
        <section className="space-y-6">
          {/* Add New Product Form */}
          <form
            onSubmit={handleAddNewProduct}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4"
          >
            <div>
              <h2 className="text-lg font-extrabold text-brand-700">
                Dodaj novi proizvod u katalog
              </h2>
              <p className="text-xs text-slate-600">
                Svaki novi artikal koji unesete odmah se pojavljuje na početnoj
                strani prodavnice sa odgovarajućom oznakom lagera.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
              <div className="sm:col-span-2">
                <label className="mb-1 block font-bold text-slate-700">
                  Naziv proizvoda *
                </label>
                <input
                  type="text"
                  required
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  placeholder="npr. Pametna Wi-Fi Utičnica 16A sa merenjem potrošnje"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-700">
                  Interna šifra (SKU) *
                </label>
                <input
                  type="text"
                  required
                  value={newProdSku}
                  onChange={(e) => setNewProdSku(e.target.value)}
                  placeholder="NL-WIFI-16A"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono uppercase"
                />
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-700">
                  EAN-13 Barkod
                </label>
                <input
                  type="text"
                  value={newProdEan}
                  onChange={(e) => setNewProdEan(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono tabular-nums"
                />
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-700">
                  Kategorija
                </label>
                <select
                  value={newProdCategory}
                  onChange={(e) => setNewProdCategory(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  {db.categories.map((c) => (
                    <option key={c.id} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-700">
                  Brend
                </label>
                <input
                  type="text"
                  value={newProdBrand}
                  onChange={(e) => setNewProdBrand(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block font-bold text-slate-700">
                  Kratka tehnička specifikacija (prikazuje se na kartici)
                </label>
                <input
                  type="text"
                  value={newProdSpec}
                  onChange={(e) => setNewProdSpec(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-700">
                  Nabavna cena sa PDV (RSD)
                </label>
                <input
                  type="number"
                  value={newProdCost}
                  onChange={(e) => setNewProdCost(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 tabular-nums"
                />
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-700">
                  Maloprodajna cena (RSD)
                </label>
                <input
                  type="number"
                  value={newProdPrice}
                  onChange={(e) => setNewProdPrice(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-bold text-brand-700 tabular-nums"
                />
              </div>

              <div>
                <label className="mb-1 block font-bold text-stock-700">
                  Naš magacin (kom — 1–2 dana)
                </label>
                <input
                  type="number"
                  min={0}
                  value={newProdOwnStock}
                  onChange={(e) => setNewProdOwnStock(Number(e.target.value))}
                  className="w-full rounded-lg border border-stock-200 bg-stock-50/40 px-3 py-2 font-bold tabular-nums"
                />
              </div>

              <div>
                <label className="mb-1 block font-bold text-amber-800">
                  Lager dobavljača (kom — 2–5 dana)
                </label>
                <input
                  type="number"
                  min={0}
                  value={newProdSupplierStock}
                  onChange={(e) =>
                    setNewProdSupplierStock(Number(e.target.value))
                  }
                  className="w-full rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-2 font-bold tabular-nums"
                />
              </div>
            </div>

            <button
              type="submit"
              className="cursor-pointer rounded-xl bg-brand-700 px-5 py-2.5 text-xs font-extrabold text-accent-400 hover:bg-brand-600 transition"
            >
              + Sačuvaj i objavi novi proizvod
            </button>
          </form>

          {/* Existing Products Table with Live Stock & Price Editing */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <h2 className="text-lg font-extrabold text-brand-700 mb-1">
              Upravljanje zalihama i cenama ({db.products.length} artikala)
            </h2>
            <p className="text-xs text-slate-600 mb-4">
              Promenite broj komada u koloni <strong>Naš magacin</strong> ili{" "}
              <strong>Lager dobavljača</strong> — status isporuke na sajtu se
              automatski preračunava.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <th className="p-3">SKU / Artikal</th>
                    <th className="p-3">Javni status na sajtu</th>
                    <th className="p-3">Naš magacin (kom)</th>
                    <th className="p-3">Lager dobavljača</th>
                    <th className="p-3">Nabavna (RSD)</th>
                    <th className="p-3">Prodajna (RSD)</th>
                    <th className="p-3">Bruto marža</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {db.products.map((p) => {
                    const freeOwn = Math.max(
                      0,
                      p.ownStockQty - p.reservedOwnStockQty
                    );
                    const marginPct =
                      p.priceRsd > 0
                        ? (
                            ((p.priceRsd - p.costPriceRsd) / p.priceRsd) *
                            100
                          ).toFixed(1)
                        : "0.0";

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80">
                        <td className="p-3">
                          <Link
                            href={`/proizvod/${p.slug}`}
                            className="font-bold text-brand-700 hover:underline block"
                          >
                            {p.name}
                          </Link>
                          <span className="font-mono text-[11px] text-slate-500">
                            {p.sku} • EAN: {p.ean} • Dobavljač: {p.supplierName}
                          </span>
                        </td>
                        <td className="p-3">
                          {freeOwn > 0 ? (
                            <span className="inline-block rounded-full bg-stock-50 px-2.5 py-1 text-[11px] font-bold text-stock-700 border border-stock-100">
                              ● Naš lager • 1–2 dana
                            </span>
                          ) : p.supplierStockQty > 0 ? (
                            <span className="inline-block rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-900 border border-amber-200">
                              ● Lager dobavljača • 2–5 dana
                            </span>
                          ) : (
                            <span className="inline-block rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-700">
                              Rasprodato
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <input
                            type="number"
                            min={0}
                            value={p.ownStockQty}
                            onChange={(e) =>
                              handleQuickStockPriceChange(
                                p.id,
                                "ownStockQty",
                                Number(e.target.value)
                              )
                            }
                            className="w-20 rounded-lg border border-stock-200 bg-stock-50/50 px-2.5 py-1.5 font-extrabold text-stock-700 tabular-nums"
                          />
                          {p.reservedOwnStockQty > 0 && (
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              Rezervisano: {p.reservedOwnStockQty}
                            </div>
                          )}
                        </td>
                        <td className="p-3">
                          <input
                            type="number"
                            min={0}
                            value={p.supplierStockQty}
                            onChange={(e) =>
                              handleQuickStockPriceChange(
                                p.id,
                                "supplierStockQty",
                                Number(e.target.value)
                              )
                            }
                            className="w-20 rounded-lg border border-amber-200 bg-amber-50/50 px-2.5 py-1.5 font-bold text-amber-900 tabular-nums"
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="number"
                            min={0}
                            value={p.costPriceRsd}
                            onChange={(e) =>
                              handleQuickStockPriceChange(
                                p.id,
                                "costPriceRsd",
                                Number(e.target.value)
                              )
                            }
                            className="w-24 rounded-lg border border-slate-300 px-2.5 py-1.5 tabular-nums"
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="number"
                            min={0}
                            value={p.priceRsd}
                            onChange={(e) =>
                              handleQuickStockPriceChange(
                                p.id,
                                "priceRsd",
                                Number(e.target.value)
                              )
                            }
                            className="w-24 rounded-lg border border-brand-300 bg-brand-50/30 px-2.5 py-1.5 font-extrabold text-brand-700 tabular-nums"
                          />
                        </td>
                        <td className="p-3 font-extrabold text-stock-600 tabular-nums">
                          {marginPct}%
                          <div className="text-[10px] font-normal text-slate-500">
                            +{formatRsd(p.priceRsd - p.costPriceRsd)}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* TAB 4: DOBAVLJAČI & CSV/XML UVOZ (DRY-RUN & SAFE APPLY) */}
      {activeTab === "suppliers" && (
        <section className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            {db.suppliers.map((s) => (
              <div
                key={s.id}
                onClick={() => {
                  setSelectedSupplierId(s.id);
                  setFeedPricesIncludeVat(s.pricesIncludeVat);
                }}
                className={`cursor-pointer rounded-2xl border p-4 transition ${
                  selectedSupplierId === s.id
                    ? "border-brand-700 bg-brand-50/40 shadow-xs"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-brand-700">
                    {s.code}
                  </span>
                  <span className="rounded-full bg-stock-50 px-2.5 py-0.5 text-[11px] font-bold text-stock-700 border border-stock-100">
                    Pouzdanost: {s.reliabilityScore}%
                  </span>
                </div>
                <h3 className="mt-1.5 text-sm font-extrabold text-brand-700">
                  {s.name}
                </h3>
                <div className="mt-2 space-y-1 text-xs text-slate-600">
                  <div>
                    Cene u fajlu:{" "}
                    <strong>
                      {s.pricesIncludeVat
                        ? "Sa PDV-om"
                        : "Bez PDV-a (+20% PDV automatski)"}
                    </strong>
                  </div>
                  <div>
                    Mapiranje kolona:{" "}
                    <code className="text-[11px]">
                      {s.skuColumn} / {s.costColumn} / {s.stockColumn}
                    </code>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Poslednja sinhronizacija: {s.lastSyncAt}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-extrabold text-brand-700">
                  Simulator uvoza cenovnika dobavljača (Dry-Run zaštita)
                </h2>
                <p className="text-xs text-slate-600">
                  Sistem prvo proverava CSV fajl, preračunava +20% PDV (ako su
                  cene veleprodajne neto) i zaokružuje maloprodajne cene na{" "}
                  <strong>-90 RSD</strong>.
                </p>
              </div>

              <label className="flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50/60 px-3.5 py-2 text-xs font-bold text-brand-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!feedPricesIncludeVat}
                  onChange={(e) => setFeedPricesIncludeVat(!e.target.checked)}
                  className="h-4 w-4 rounded"
                />
                <span>
                  Cene u CSV-u su BEZ PDV-a (dodaj +20% PDV automatski)
                </span>
              </label>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                CSV sadržaj cenovnika dobavljača (možete izmeniti cene ili
                dodati novi red):
              </label>
              <textarea
                rows={5}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 p-3 font-mono text-xs text-slate-800"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleRunDryRun}
                className="cursor-pointer rounded-xl bg-brand-700 px-5 py-2.5 text-xs font-extrabold text-accent-400 hover:bg-brand-600 transition"
              >
                1. Pokreni Dry-Run proveru (bez upisa u bazu)
              </button>

              {dryRunRows && (
                <button
                  type="button"
                  onClick={handleApplyCsvImport}
                  className="cursor-pointer rounded-xl bg-stock-600 px-5 py-2.5 text-xs font-extrabold text-white hover:bg-stock-700 transition"
                >
                  2. Primeni uvoz u katalog ({dryRunRows.length} artikala)
                </button>
              )}
            </div>

            {dryRunRows && (
              <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <th className="p-3">Akcija</th>
                      <th className="p-3">SKU</th>
                      <th className="p-3">Naziv artikla</th>
                      <th className="p-3 text-right">U fajlu</th>
                      <th className="p-3 text-right">Nabavna sa PDV</th>
                      <th className="p-3 text-right">Nova MP Cena (-90)</th>
                      <th className="p-3 text-right">Lager dobavljača</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {dryRunRows.map((r, idx) => (
                      <tr key={idx}>
                        <td className="p-3">
                          <span
                            className={`rounded px-2 py-0.5 text-[11px] font-bold ${
                              r.action === "NEW"
                                ? "bg-brand-100 text-brand-800"
                                : r.action === "PRICE_ALERT"
                                  ? "bg-amber-100 text-amber-900"
                                  : "bg-stock-50 text-stock-700"
                            }`}
                          >
                            {r.action === "NEW"
                              ? "NOVI ARTIKAL"
                              : r.action === "PRICE_ALERT"
                                ? `SKOK CENE (${r.priceDiffPct}%)`
                                : "AŽURIRANJE"}
                          </span>
                        </td>
                        <td className="p-3 font-mono font-bold text-brand-700">
                          {r.sku}
                        </td>
                        <td className="p-3 font-semibold text-slate-800">
                          {r.name}
                        </td>
                        <td className="p-3 text-right tabular-nums text-slate-500">
                          {formatRsd(r.rawCost)}
                        </td>
                        <td className="p-3 text-right font-bold tabular-nums">
                          {formatRsd(r.costWithVat)}
                        </td>
                        <td className="p-3 text-right font-extrabold text-brand-700 tabular-nums">
                          {formatRsd(r.recommendedSellingPrice)}
                        </td>
                        <td className="p-3 text-right font-bold text-stock-700 tabular-nums">
                          {r.supplierStock} kom
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}

      {/* TAB 5: PRAVILA MARŽI (KALKULATOR) & PROMO KUPONI */}
      {activeTab === "pricing" && (
        <section className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <h2 className="text-lg font-extrabold text-brand-700">
              Kalkulator maloprodajne cene i zaštite marže (Pouzeće u Srbiji)
            </h2>
            <p className="text-xs text-slate-600">
              Razlika između prostog rabata (Markup) i stvarne bruto marže
              (Gross Margin), uz uračunat očekivani trošak nepreuzetih paketa.
            </p>

            <div className="grid gap-4 sm:grid-cols-2 text-xs">
              <div>
                <label className="mb-1 block font-bold text-slate-700">
                  Nabavna cena sa PDV-om (RSD)
                </label>
                <input
                  type="number"
                  value={simCostWithVat}
                  onChange={(e) => {
                    setSimCostWithVat(Number(e.target.value));
                    markTaskComplete(4);
                  }}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-bold tabular-nums"
                />
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-700">
                  Ciljna bruto marža (%)
                </label>
                <input
                  type="number"
                  min={5}
                  max={70}
                  value={simTargetMarginPct}
                  onChange={(e) => {
                    setSimTargetMarginPct(Number(e.target.value));
                    markTaskComplete(4);
                  }}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-bold tabular-nums"
                />
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-700">
                  Očekivani % nepreuzetih pouzeća
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={simUnclaimedRatePct}
                  onChange={(e) =>
                    setSimUnclaimedRatePct(Number(e.target.value))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 tabular-nums"
                />
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-700">
                  Trošak duple poštarine pri povratu (RSD)
                </label>
                <input
                  type="number"
                  value={simReturnShippingRsd}
                  onChange={(e) =>
                    setSimReturnShippingRsd(Number(e.target.value))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 tabular-nums"
                />
              </div>
            </div>

            <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-600">
                  Rezerva za nepreuzete pakete po porudžbini:
                </span>
                <strong className="tabular-nums">
                  {formatRsd(expectedCodLossPerOrderRsd)}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">
                  Efektivna cena koštanja (Nabavna + COD rizik):
                </span>
                <strong className="tabular-nums">
                  {formatRsd(effectiveCostRsd)}
                </strong>
              </div>
              <div className="flex justify-between border-t border-brand-200 pt-2 text-sm">
                <span className="font-bold text-brand-700">
                  Preporučena MP cena (zaokružena na -90 RSD):
                </span>
                <span className="text-lg font-extrabold text-brand-700 tabular-nums">
                  {formatRsd(roundedSellingRsd)}
                </span>
              </div>
              <div className="flex justify-between text-stock-700 font-bold">
                <span>Čista zarada po isporučenom paketu:</span>
                <span className="tabular-nums">
                  +{formatRsd(netProfitPerOrderRsd)} ({actualGrossMarginPct}%
                  bruto marža)
                </span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <h2 className="text-lg font-extrabold text-brand-700">
              Aktivni promo kuponi (sa zaštitom minimalne marže)
            </h2>

            <ul className="divide-y divide-slate-200 text-xs">
              {db.coupons.map((c) => (
                <li
                  key={c.id}
                  className="py-3 flex items-center justify-between gap-2"
                >
                  <div>
                    <span className="font-mono text-sm font-extrabold text-brand-700">
                      {c.code}
                    </span>{" "}
                    <span className="rounded bg-stock-50 px-2 py-0.5 font-bold text-stock-700">
                      -{c.discountPercent}%
                    </span>
                    <div className="text-slate-500 mt-0.5">{c.description}</div>
                  </div>
                  <span className="text-slate-500 tabular-nums">
                    Iskorišćeno: <strong>{c.usedCount}×</strong>
                  </span>
                </li>
              ))}
            </ul>

            <form
              onSubmit={handleAddCoupon}
              className="space-y-3 border-t border-slate-200 pt-4 text-xs"
            >
              <div className="font-bold text-brand-700">
                Dodaj novi promo kod:
              </div>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  required
                  value={newCouponCode}
                  onChange={(e) => setNewCouponCode(e.target.value)}
                  placeholder="KOD (npr. LAGER10)"
                  className="rounded-lg border border-slate-300 px-2.5 py-2 font-mono uppercase"
                />
                <input
                  type="number"
                  min={3}
                  max={30}
                  value={newCouponPct}
                  onChange={(e) => setNewCouponPct(Number(e.target.value))}
                  placeholder="Popust %"
                  className="rounded-lg border border-slate-300 px-2.5 py-2 tabular-nums"
                />
                <input
                  type="number"
                  value={newCouponMinSubtotal}
                  onChange={(e) =>
                    setNewCouponMinSubtotal(Number(e.target.value))
                  }
                  placeholder="Min RSD"
                  className="rounded-lg border border-slate-300 px-2.5 py-2 tabular-nums"
                />
              </div>
              <button
                type="submit"
                className="cursor-pointer w-full rounded-xl bg-brand-700 px-4 py-2 font-bold text-white hover:bg-brand-600"
              >
                + Aktiviraj kupon
              </button>
            </form>
          </div>
        </section>
      )}

      {/* TAB 6: REKLAMACIJE (RMA — ZAKONSKI ROK 8 / 15 DANA) */}
      {activeTab === "rma" && (
        <section className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <h2 className="text-lg font-extrabold text-brand-700">
              Elektronska knjiga reklamacija i odustanaka od ugovora (Zakon o
              zaštiti potrošača RS)
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Zakonski rok za odgovor potrošaču je{" "}
              <strong>8 kalendarskih dana</strong>, a za rešavanje reklamacije{" "}
              <strong>15 dana</strong>.
            </p>

            <div className="mt-4 space-y-4">
              {db.rmas.map((rma) => (
                <div
                  key={rma.id}
                  className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-xs space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-mono text-sm font-extrabold text-brand-700">
                        {rma.rmaNumber}
                      </span>{" "}
                      <span className="text-slate-500">
                        (Porudžbina: <strong>{rma.orderNumber}</strong>)
                      </span>
                      <div className="mt-0.5 text-slate-700">
                        Kupac: <strong>{rma.customerName}</strong> • Tel:{" "}
                        <strong>{rma.customerPhone}</strong> • Artikal:{" "}
                        <strong>
                          {rma.productName} ({rma.productSku})
                        </strong>
                      </div>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 font-bold ${
                        rma.status === "Received"
                          ? "bg-amber-100 text-amber-900"
                          : "bg-stock-100 text-stock-700"
                      }`}
                    >
                      {rma.status === "Received"
                        ? "ČEKA ZVANIČAN ODGOVOR (ROK 8 DANA)"
                        : rma.status === "AnsweredWithin8Days"
                          ? "ODGOVORENO U ROKU OD 8 DANA"
                          : rma.status === "ResolvedRestocked"
                            ? "REŠENO & VRAĆENO NA LAGER"
                            : "ODBIJENO"}
                    </span>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <div className="font-bold text-slate-700">
                      Razlog prijave ({rma.type}):
                    </div>
                    <p className="mt-0.5 text-slate-600">{rma.reason}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={
                        rmaNotes[rma.id] ??
                        rma.adminResponseNote ??
                        "Zahtev je prihvaćen. Odobrena zamena ili povrat sredstava po prijemu artikla."
                      }
                      onChange={(e) =>
                        setRmaNotes({ ...rmaNotes, [rma.id]: e.target.value })
                      }
                      className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        handleRmaAnswer(rma.id, "AnsweredWithin8Days")
                      }
                      className="cursor-pointer rounded-lg bg-brand-700 px-3.5 py-2 font-bold text-white hover:bg-brand-600"
                    >
                      Pošalji odgovor (8 dana)
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleRmaAnswer(rma.id, "ResolvedRestocked")
                      }
                      className="cursor-pointer rounded-lg bg-stock-600 px-3.5 py-2 font-bold text-white hover:bg-stock-700"
                    >
                      Uvaži i vrati na naš lager (+1 kom)
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* A4 PRINTABLE PACKING SLIP + 14-DAY WITHDRAWAL FORM MODAL */}
      {printingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-900/70 p-4 overflow-y-auto">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-8 text-xs text-slate-800 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-300 pb-4">
              <div>
                <div className="text-lg font-extrabold text-brand-700">
                  {STORE_CONFIG.legalInfo.companyName}
                </div>
                <div className="text-slate-500">
                  OTPREMNICA / SPECIFIKACIJA POŠILJKE:{" "}
                  <strong className="font-mono text-brand-700">
                    {printingOrder.orderNumber}
                  </strong>
                </div>
              </div>
              <div className="flex gap-2 print:hidden">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="cursor-pointer rounded-lg bg-brand-700 px-4 py-2 font-extrabold text-accent-400 hover:bg-brand-600"
                >
                  🖨 Štampaj A4 dokument
                </button>
                <button
                  type="button"
                  onClick={() => setPrintingOrder(null)}
                  className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 font-bold text-slate-700"
                >
                  Zatvori
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <div className="text-slate-500">Primalac pošiljke:</div>
                <div className="font-bold text-sm text-brand-700">
                  {printingOrder.customerFullName}
                </div>
                <div>{printingOrder.streetAndNumber}</div>
                <div>
                  {printingOrder.postalCode} {printingOrder.city}
                </div>
                <div>Tel: {printingOrder.customerPhone}</div>
              </div>
              <div className="text-right">
                <div>
                  Datum:{" "}
                  <strong>{printingOrder.createdAt.slice(0, 10)}</strong>
                </div>
                <div>
                  Kurir:{" "}
                  <strong>
                    {printingOrder.courierName || "PostExpress"}
                  </strong>
                </div>
                <div>
                  Broj pošiljke:{" "}
                  <strong className="font-mono">
                    {printingOrder.trackingNumber || "PE-U-PRIPREMI"}
                  </strong>
                </div>
                <div>
                  Fiskalni račun:{" "}
                  <strong className="font-mono">
                    {printingOrder.fiscalInvoiceNumber || "PFR-PRILOŽEN"}
                  </strong>
                </div>
              </div>
            </div>

            <table className="w-full border-collapse border border-slate-300 text-left">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-300 p-2">Šifra (SKU)</th>
                  <th className="border border-slate-300 p-2">Naziv artikla</th>
                  <th className="border border-slate-300 p-2 text-right">
                    Kol.
                  </th>
                  <th className="border border-slate-300 p-2 text-right">
                    Cena
                  </th>
                  <th className="border border-slate-300 p-2 text-right">
                    Ukupno
                  </th>
                </tr>
              </thead>
              <tbody>
                {printingOrder.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="border border-slate-300 p-2 font-mono">
                      {item.sku}
                    </td>
                    <td className="border border-slate-300 p-2">
                      {item.productName}
                    </td>
                    <td className="border border-slate-300 p-2 text-right tabular-nums">
                      {item.quantity}
                    </td>
                    <td className="border border-slate-300 p-2 text-right tabular-nums">
                      {formatRsd(item.unitPriceRsd)}
                    </td>
                    <td className="border border-slate-300 p-2 text-right font-bold tabular-nums">
                      {formatRsd(item.lineTotalRsd)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="text-right text-sm font-extrabold text-brand-700 tabular-nums">
              UKUPNO ZA NAPLATU:{" "}
              {printingOrder.paymentMethod === "CashOnDelivery"
                ? formatRsd(printingOrder.totalRsd)
                : `0 RSD (Plaćeno IPS QR: ${formatRsd(printingOrder.totalRsd)})`}
            </div>

            <div className="border-t-2 border-dashed border-slate-300 pt-4 space-y-2 text-[11px]">
              <div className="font-extrabold text-brand-700 uppercase">
                OBRAZAC ZA ODUSTANAK OD UGOVORA NA DALJINU U ROKU OD 14 DANA
                (Zakon o zaštiti potrošača RS)
              </div>
              <p className="text-slate-600">
                Kupac ima pravo da u roku od 14 dana od prijema pošiljke
                odustane od kupovine bez navođenja razloga. Popunjen obrazac
                možete poslati elektronski na{" "}
                <strong>{STORE_CONFIG.supportEmail}</strong> ili priložiti uz
                vraćenu robu:
              </p>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="border-b border-slate-400 pb-3">
                  Broj porudžbine: <strong>{printingOrder.orderNumber}</strong>
                </div>
                <div className="border-b border-slate-400 pb-3">
                  Broj tekućeg računa za povrat novca: ______________________
                </div>
                <div className="border-b border-slate-400 pb-3">
                  Datum prijema robe: ______________________
                </div>
                <div className="border-b border-slate-400 pb-3">
                  Potpis kupca: ______________________
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

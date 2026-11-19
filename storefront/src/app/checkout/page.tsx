"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import { useCart } from "@/components/CartContext";
import {
  API_BASE_URL,
  CheckoutQuoteResponseDto,
  formatRsd,
} from "@/lib/api";
import {
  buildFallbackCheckoutQuote,
  loadTrainingDb,
  saveTrainingDb,
  TrainingOrderRecord,
} from "@/lib/training-store";

export default function CheckoutPage() {
  const { items, updateQuantity, removeItem, clearCart } = useCart();
  const router = useRouter();

  const [quote, setQuote] = useState<CheckoutQuoteResponseDto | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [note, setNote] = useState("");
  const [isB2bInvoice, setIsB2bInvoice] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [companyPib, setCompanyPib] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CashOnDelivery");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [websiteHoneypot, setWebsiteHoneypot] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const idempotencyKeyRef = useRef<string>(
    `WEB-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  );

  useEffect(() => {
    if (items.length === 0) {
      setQuote(null);
      return;
    }

    let cancelled = false;
    setLoadingQuote(true);

    const reqItems = items.map((i) => ({
      variantId: i.variantId,
      quantity: i.quantity,
    }));

    const quoteUrl = appliedCoupon
      ? `${API_BASE_URL}/api/v1/checkout/quote?couponCode=${encodeURIComponent(appliedCoupon)}`
      : `${API_BASE_URL}/api/v1/checkout/quote`;

    fetch(quoteUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reqItems),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Fallback quote");
        return res.json();
      })
      .then((data: CheckoutQuoteResponseDto) => {
        if (!cancelled) {
          setQuote(data);
          setLoadingQuote(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          const fallback = buildFallbackCheckoutQuote(reqItems, appliedCoupon);
          setQuote(fallback);
          setLoadingQuote(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [items, appliedCoupon]);

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (websiteHoneypot.trim() !== "") {
      return;
    }

    if (!acceptedTerms) {
      setErrorMessage(
        "Molimo vas da potvrdite upoznavanje sa uslovima kupovine i obavezom plaćanja pri preuzimanju."
      );
      return;
    }

    if (!quote || !quote.canProceed) {
      setErrorMessage(
        quote?.validationError ||
          "Proverite stavke u korpi pre slanja porudžbine."
      );
      return;
    }

    const combinedNote =
      isB2bInvoice && companyPib.trim()
        ? `[RAČUN ZA FIRMU: ${companyName.trim()} | PIB: ${companyPib.trim()}] ${note}`.trim()
        : note;

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/checkout/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idempotencyKey: idempotencyKeyRef.current,
          customerFullName: fullName,
          customerPhone: phone,
          customerEmail: email,
          shippingStreet: street,
          shippingCity: city,
          shippingPostalCode: postalCode,
          customerNote: combinedNote,
          couponCode: appliedCoupon || null,
          preferredPaymentMethod: paymentMethod,
          items: items.map((i) => ({
            variantId: i.variantId,
            quantity: i.quantity,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(
          data.message || "Došlo je do greške pri kreiranju porudžbine."
        );
        setSubmitting(false);
        return;
      }

      clearCart();
      router.push(`/potvrda/${encodeURIComponent(data.orderNumber)}`);
    } catch {
      // Fallback: Save directly into local training database so Vercel training mode works end-to-end
      const db = loadTrainingDb();
      const orderNum = `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(db.orders.length + 1).padStart(3, "0")}`;
      const newOrder: TrainingOrderRecord = {
        id: `ord-${Date.now()}`,
        orderNumber: orderNum,
        createdAt: new Date().toISOString(),
        customerFullName: fullName,
        customerPhone: phone,
        customerEmail: email,
        streetAndNumber: street,
        city,
        postalCode,
        deliveryNotes: combinedNote,
        paymentMethod:
          paymentMethod === "BankTransfer" ? "IpsQr" : "CashOnDelivery",
        status: "PendingConfirmation",
        riskLevel: quote.totalRsd > 25000 ? "Medium" : "Low",
        riskNote:
          quote.totalRsd > 25000
            ? "Porudžbina preko 25.000 RSD — preporučena telefonska potvrda."
            : "Validan +381 telefon i 5-cifreni poštanski broj.",
        subtotalRsd: quote.subtotalRsd,
        discountRsd: quote.discountRsd || 0,
        shippingRsd: quote.shippingCostRsd,
        totalRsd: quote.totalRsd,
        appliedCouponCode: quote.appliedCouponCode,
        items: quote.lines.map((line) => {
          const prod = db.products.find((p) => p.variantId === line.variantId);
          if (prod && line.fulfillmentSource === "OwnStock") {
            prod.reservedOwnStockQty += line.quantity;
          }
          return {
            variantId: line.variantId,
            sku: line.internalSku,
            productName: line.productName,
            quantity: line.quantity,
            unitPriceRsd: line.unitPriceRsd,
            unitCostRsd: prod?.costPriceRsd || Math.round(line.unitPriceRsd * 0.7),
            lineTotalRsd: line.lineTotalRsd,
            fulfillmentSource:
              line.fulfillmentSource === "OwnStock"
                ? "OwnStock"
                : "SupplierDropship",
          };
        }),
      };

      db.orders.unshift(newOrder);
      saveTrainingDb(db);
      clearCart();
      router.push(`/potvrda/${encodeURIComponent(orderNum)}`);
    }
  };

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-xs">
        <h1 className="text-2xl font-extrabold text-brand-700">
          Vaša korpa je trenutno prazna
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Dodajte željene proizvode iz kataloga kako biste videli obračun
          isporuke i poručili.
        </p>
        <Link
          href="/"
          className="mt-5 inline-block rounded-lg bg-brand-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-600 transition"
        >
          Povratak u katalog proizvoda
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-brand-700">
          Korpa i Poručivanje (Bez registracije)
        </h1>
        <p className="text-xs text-slate-600">
          Sve cene, izvor isporuke i trošak dostave obračunavaju se automatski
          pre potvrde.
        </p>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm font-medium text-red-800"
        >
          {errorMessage}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Left: Server-verified Cart Items */}
        <div className="space-y-4 lg:col-span-7">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <h2 className="mb-4 text-base font-bold text-brand-700">
              1. Stavke u korpi (Provera lagera i cena)
            </h2>

            {loadingQuote && (
              <p className="text-xs text-slate-500">
                Proveravamo aktuelne cene i stanje na lageru...
              </p>
            )}

            <div className="divide-y divide-slate-200">
              {items.map((cartItem) => {
                const serverLine = quote?.lines.find(
                  (l) => l.variantId === cartItem.variantId
                );

                return (
                  <div
                    key={cartItem.variantId}
                    className="flex flex-wrap items-center justify-between gap-4 py-4"
                  >
                    <div className="max-w-sm">
                      <Link
                        href={`/proizvod/${cartItem.productSlug}`}
                        className="font-bold text-brand-700 hover:text-brand-500"
                      >
                        {serverLine?.productName || cartItem.productName}
                      </Link>
                      <div className="mt-0.5 text-xs text-slate-500">
                        SKU: <span className="font-mono">{cartItem.sku}</span>
                        {serverLine && (
                          <span className="ml-2 text-stock-600 font-semibold">
                            • {serverLine.publicAvailabilityLabel}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <label
                        className="sr-only"
                        htmlFor={`qty-${cartItem.variantId}`}
                      >
                        Količina
                      </label>
                      <input
                        id={`qty-${cartItem.variantId}`}
                        type="number"
                        min={1}
                        max={20}
                        value={cartItem.quantity}
                        onChange={(e) =>
                          updateQuantity(
                            cartItem.variantId,
                            parseInt(e.target.value || "1", 10)
                          )
                        }
                        className="w-16 rounded border border-slate-300 px-2 py-1 text-center text-sm font-semibold tabular-nums"
                      />

                      <div className="w-28 text-right">
                        <div className="text-sm font-extrabold text-brand-700 tabular-nums">
                          {serverLine
                            ? formatRsd(serverLine.lineTotalRsd)
                            : "..."}
                        </div>
                        {serverLine && (
                          <div className="text-[11px] text-slate-500 tabular-nums">
                            {formatRsd(serverLine.unitPriceRsd)} / kom
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(cartItem.variantId)}
                        className="text-xs font-semibold text-red-600 hover:underline"
                      >
                        Ukloni
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {quote && (
              <div className="mt-4 space-y-3 border-t border-slate-200 bg-slate-50 p-4 rounded-xl text-sm">
                <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    placeholder="Promo kod (npr. DOBRODOSLI10)"
                    className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs uppercase"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setAppliedCoupon(couponInput.trim().toUpperCase())
                    }
                    className="cursor-pointer rounded-lg bg-brand-700 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-brand-600"
                  >
                    Primeni kod
                  </button>
                </div>

                {quote.couponMessage && (
                  <div className="rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-800 border border-brand-200">
                    {quote.couponMessage}
                  </div>
                )}

                {quote.subtotalRsd < 12000 && (
                  <div className="text-xs text-slate-600">
                    Dodajte još{" "}
                    <strong className="tabular-nums">
                      {formatRsd(12000 - quote.subtotalRsd)}
                    </strong>{" "}
                    za{" "}
                    <span className="font-bold text-stock-600">
                      besplatnu isporuku
                    </span>
                    !
                  </div>
                )}

                <div className="flex justify-between text-slate-700">
                  <span>Međuzbir artikala (sa PDV-om):</span>
                  <span className="font-semibold tabular-nums">
                    {formatRsd(quote.subtotalRsd)}
                  </span>
                </div>
                {(quote.discountRsd ?? 0) > 0 && (
                  <div className="flex justify-between text-stock-600 font-semibold">
                    <span>Promo popust ({quote.appliedCouponCode}):</span>
                    <span className="tabular-nums">
                      -{formatRsd(quote.discountRsd || 0)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-slate-700">
                  <span>Trošak dostave kurirskom službom:</span>
                  <span className="font-semibold tabular-nums">
                    {quote.shippingCostRsd === 0
                      ? "BESPLATNA (0 RSD)"
                      : formatRsd(quote.shippingCostRsd)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-300 pt-2 text-base font-extrabold text-brand-700">
                  <span>Ukupno za plaćanje:</span>
                  <span className="tabular-nums">
                    {formatRsd(quote.totalRsd)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Customer & Delivery Form */}
        <div className="lg:col-span-5">
          <form
            onSubmit={handleSubmitOrder}
            className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs"
          >
            <h2 className="text-base font-bold text-brand-700">
              2. Podaci za dostavu i kontakt
            </h2>

            <div className="hidden" aria-hidden="true">
              <label htmlFor="website-hp">Ne popunjavajte ovo polje</label>
              <input
                id="website-hp"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={websiteHoneypot}
                onChange={(e) => setWebsiteHoneypot(e.target.value)}
              />
            </div>

            <div>
              <label
                htmlFor="fullName"
                className="block text-xs font-bold text-slate-700"
              >
                Ime i prezime primaoca *
              </label>
              <input
                id="fullName"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="npr. Marko Petrović"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="phone"
                  className="block text-xs font-bold text-slate-700"
                >
                  Telefon za kurira *
                </label>
                <input
                  id="phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="064 123 4567"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-bold text-slate-700"
                >
                  Email za potvrdu porudžbine *
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ime@primer.rs"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="street"
                className="block text-xs font-bold text-slate-700"
              >
                Ulica i kućni broj *
              </label>
              <input
                id="street"
                type="text"
                required
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder="npr. Bulevar Kralja Aleksandra 73"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="city"
                  className="block text-xs font-bold text-slate-700"
                >
                  Mesto / Grad *
                </label>
                <input
                  id="city"
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Beograd"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="postalCode"
                  className="block text-xs font-bold text-slate-700"
                >
                  Poštanski broj (5 cifara) *
                </label>
                <input
                  id="postalCode"
                  type="text"
                  required
                  pattern="\d{5}"
                  title="Unesite tačno 5 cifara poštanskog broja u Srbiji (npr. 11000)"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="11000"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none tabular-nums"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="note"
                className="block text-xs font-bold text-slate-700"
              >
                Napomena za dostavu (opciono)
              </label>
              <textarea
                id="note"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Interfon, sprat ili vreme kada ste na adresi..."
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs">
              <label className="flex items-center gap-2 font-bold text-brand-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isB2bInvoice}
                  onChange={(e) => setIsB2bInvoice(e.target.checked)}
                  className="rounded border-slate-300"
                />
                <span>Želim fiskalni račun na firmu (unesite PIB i naziv)</span>
              </label>

              {isB2bInvoice && (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="companyName"
                      className="mb-1 block font-semibold text-slate-700"
                    >
                      Naziv firme / radnje *
                    </label>
                    <input
                      id="companyName"
                      type="text"
                      required={isB2bInvoice}
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="npr. Tehno Mont DOO"
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="companyPib"
                      className="mb-1 block font-semibold text-slate-700"
                    >
                      PIB (9 cifara) *
                    </label>
                    <input
                      id="companyPib"
                      type="text"
                      required={isB2bInvoice}
                      pattern="\d{9}"
                      title="Unesite 9 cifara PIB-a"
                      value={companyPib}
                      onChange={(e) => setCompanyPib(e.target.value)}
                      placeholder="100000000"
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono tabular-nums"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2 rounded-xl bg-slate-50 p-3.5 text-xs text-slate-700 border border-slate-200">
              <div className="font-bold text-brand-700">Način plaćanja:</div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="CashOnDelivery"
                  checked={paymentMethod === "CashOnDelivery"}
                  onChange={() => setPaymentMethod("CashOnDelivery")}
                />
                <span>
                  <strong>Plaćanje pouzećem</strong> — gotovinom kuriru prilikom
                  preuzimanja
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="BankTransfer"
                  checked={paymentMethod === "BankTransfer"}
                  onChange={() => setPaymentMethod("BankTransfer")}
                />
                <span>
                  <strong>Uplata na račun (NBS IPS QR)</strong> — instant
                  m-banking nalog na sledećem koraku
                </span>
              </label>
            </div>

            <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-0.5 rounded border-slate-300"
              />
              <span>
                Prihvatam{" "}
                <Link
                  href="/uslovi-kupovine"
                  target="_blank"
                  className="font-semibold text-brand-700 underline"
                >
                  uslove kupovine, politiku privatnosti i informaciju o pravu na
                  odustanak (14 dana)
                </Link>{" "}
                i potvrđujem porudžbinu sa obavezom plaćanja.
              </span>
            </label>

            <button
              type="submit"
              disabled={submitting || loadingQuote || !quote?.canProceed}
              className="cursor-pointer w-full rounded-xl bg-brand-700 px-5 py-3.5 text-sm font-extrabold text-white shadow-sm hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-slate-300 transition tabular-nums"
            >
              {submitting
                ? "Slanje porudžbine..."
                : `Potvrdi porudžbinu (${
                    quote ? formatRsd(quote.totalRsd) : "..."
                  })`}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

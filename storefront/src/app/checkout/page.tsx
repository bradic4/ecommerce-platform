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
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CashOnDelivery");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  // Section 25.3: Honeypot field against automated bot submissions
  const [websiteHoneypot, setWebsiteHoneypot] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Stable idempotency key per checkout form session (AT-01: prevents double-click duplicate orders)
  const idempotencyKeyRef = useRef<string>(
    `WEB-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  );

  // Fetch authoritative server-side quote whenever cart items change (Section 04.1 & 10.2)
  useEffect(() => {
    if (items.length === 0) {
      setQuote(null);
      return;
    }

    let cancelled = false;
    setLoadingQuote(true);

    const quoteUrl = appliedCoupon
      ? `${API_BASE_URL}/api/v1/checkout/quote?couponCode=${encodeURIComponent(appliedCoupon)}`
      : `${API_BASE_URL}/api/v1/checkout/quote`;

    fetch(quoteUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        items.map((i) => ({ variantId: i.variantId, quantity: i.quantity }))
      ),
    })
      .then((res) => res.json())
      .then((data: CheckoutQuoteResponseDto) => {
        if (!cancelled) {
          setQuote(data);
          setLoadingQuote(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setErrorMessage(
            "Trenutno nije moguće proveriti stanje i cene sa serverom. Pokušajte ponovo."
          );
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
        quote?.validationError || "Proverite stavke u korpi pre slanja porudžbine."
      );
      return;
    }

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
          customerNote: note,
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
      setErrorMessage(
        "Veza sa serverom je prekinuta. Proverite internet konekciju i kliknite ponovo (duplikat neće biti kreiran)."
      );
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-xs">
        <h1 className="text-2xl font-extrabold text-[#101c32]">
          Vaša korpa je trenutno prazna
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Dodajte željene proizvode iz kataloga kako biste videli obračun isporuke i poručili.
        </p>
        <Link
          href="/"
          className="mt-5 inline-block rounded-md bg-[#101c32] px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-800 transition"
        >
          Povratak u katalog proizvoda
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#101c32]">
          Korpa i Poručivanje (Bez registracije)
        </h1>
        <p className="text-xs text-slate-600">
          Sve cene, dostupnost i trošak dostave obračunavaju se direktno na serveru pre potvrde.
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
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <h2 className="mb-4 text-base font-bold text-[#101c32]">
              1. Stavke u korpi (Server-side provera)
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
                        className="font-bold text-[#101c32] hover:text-[#245eac]"
                      >
                        {serverLine?.productName || cartItem.productName}
                      </Link>
                      <div className="mt-0.5 text-xs text-slate-500">
                        SKU: <span className="font-mono">{cartItem.sku}</span>
                        {serverLine && (
                          <span className="ml-2 text-emerald-700 font-medium">
                            • {serverLine.publicAvailabilityLabel}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="sr-only" htmlFor={`qty-${cartItem.variantId}`}>
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
                        className="w-16 rounded border border-slate-300 px-2 py-1 text-center text-sm font-semibold"
                      />

                      <div className="w-28 text-right">
                        <div className="text-sm font-extrabold text-[#101c32]">
                          {serverLine
                            ? formatRsd(serverLine.lineTotalRsd)
                            : "..."}
                        </div>
                        {serverLine && (
                          <div className="text-[11px] text-slate-500">
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
              <div className="mt-4 space-y-3 border-t border-slate-200 bg-slate-50 p-4 rounded-lg text-sm">
                <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    placeholder="Promo kod (npr. DOBRODOSLI10)"
                    className="flex-1 rounded border border-slate-300 bg-white px-3 py-1.5 text-xs uppercase"
                  />
                  <button
                    type="button"
                    onClick={() => setAppliedCoupon(couponInput.trim().toUpperCase())}
                    className="rounded bg-[#101c32] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-slate-800"
                  >
                    Primeni kod
                  </button>
                </div>

                {quote.couponMessage && (
                  <div className="rounded bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-900 border border-teal-200">
                    {quote.couponMessage}
                  </div>
                )}

                {quote.subtotalRsd < 12000 && (
                  <div className="text-xs text-slate-600">
                    Dodajte još{" "}
                    <strong>{formatRsd(12000 - quote.subtotalRsd)}</strong> za{" "}
                    <span className="font-bold text-[#0f807f]">besplatnu isporuku</span>!
                  </div>
                )}

                <div className="flex justify-between text-slate-700">
                  <span>Međuzbir artikala (sa PDV-om):</span>
                  <span className="font-semibold">
                    {formatRsd(quote.subtotalRsd)}
                  </span>
                </div>
                {(quote.discountRsd ?? 0) > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Promo popust ({quote.appliedCouponCode}):</span>
                    <span>-{formatRsd(quote.discountRsd || 0)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-700">
                  <span>Trošak dostave kurirskom službom:</span>
                  <span className="font-semibold">
                    {quote.shippingCostRsd === 0
                      ? "BESPLATNA (0 RSD)"
                      : formatRsd(quote.shippingCostRsd)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-300 pt-2 text-base font-extrabold text-[#101c32]">
                  <span>Ukupno za plaćanje:</span>
                  <span>{formatRsd(quote.totalRsd)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Customer & Delivery Form */}
        <div className="lg:col-span-5">
          <form
            onSubmit={handleSubmitOrder}
            className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-xs"
          >
            <h2 className="text-base font-bold text-[#101c32]">
              2. Podaci za dostavu i kontakt
            </h2>

            {/* Honeypot invisible field (Section 25.3) */}
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
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-[#245eac] focus:outline-none"
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
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-[#245eac] focus:outline-none"
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
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-[#245eac] focus:outline-none"
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
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-[#245eac] focus:outline-none"
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
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-[#245eac] focus:outline-none"
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
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-[#245eac] focus:outline-none"
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
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-[#245eac] focus:outline-none"
              />
            </div>

            <div className="space-y-2 rounded-md bg-slate-50 p-3 text-xs text-slate-700 border border-slate-200">
              <div className="font-bold text-[#101c32]">Način plaćanja:</div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="CashOnDelivery"
                  checked={paymentMethod === "CashOnDelivery"}
                  onChange={() => setPaymentMethod("CashOnDelivery")}
                />
                <span>
                  <strong>Plaćanje pouzećem</strong> — gotovinom kuriru prilikom preuzimanja
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
                  <strong>Uplata na račun (NBS IPS QR)</strong> — instant m-banking nalog na sledećem koraku
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
                  className="font-semibold text-[#245eac] underline"
                >
                  uslove kupovine, politiku privatnosti i informaciju o pravu na odustanak (14 dana)
                </Link>{" "}
                i potvrđujem porudžbinu sa obavezom plaćanja pri preuzimanju.
              </span>
            </label>

            <button
              type="submit"
              disabled={submitting || loadingQuote || !quote?.canProceed}
              className="w-full rounded-md bg-[#0f807f] px-5 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300 transition"
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

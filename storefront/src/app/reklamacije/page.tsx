"use client";

import Link from "next/link";
import React, { useState } from "react";
import { API_BASE_URL } from "@/lib/api";

interface RmaLookupResponse {
  rmaNumber: string;
  orderNumber: string;
  type: string;
  status: string;
  productSkuOrName: string;
  quantity: number;
  officialDecisionNote?: string;
  statutoryResponseDeadlineAt: string;
  statutoryResolutionDeadlineAt: string;
  respondedAt?: string;
  resolvedAt?: string;
}

export default function ReturnsAndWarrantyPage() {
  const [orderNumber, setOrderNumber] = useState("");
  const [customerFullName, setCustomerFullName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [productSkuOrName, setProductSkuOrName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [returnType, setReturnType] = useState("Withdrawal14Days");
  const [reasonDescription, setReasonDescription] = useState("");
  const [customerBankAccount, setCustomerBankAccount] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdRmaNumber, setCreatedRmaNumber] = useState<string | null>(null);

  const [lookupRma, setLookupRma] = useState("");
  const [lookupResult, setLookupResult] = useState<RmaLookupResponse | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitMessage(null);
    setSubmitError(null);
    setCreatedRmaNumber(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/returns/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNumber,
          customerFullName,
          customerEmail,
          customerPhone,
          productSkuOrName,
          quantity,
          returnType,
          reasonDescription,
          customerBankAccount,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data?.message || "Greška prilikom slanja zahteva.");
      } else {
        setCreatedRmaNumber(data.rmaNumber);
        setSubmitMessage(data.message);
      }
    } catch {
      setSubmitError("Server trenutno nije dostupan. Pokušajte ponovo.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupRma.trim()) return;
    setLookupError(null);
    setLookupResult(null);

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/returns/lookup?rmaNumber=${encodeURIComponent(lookupRma.trim())}`
      );
      const data = await res.json();
      if (!res.ok) {
        setLookupError(data?.message || "RMA broj nije pronađen.");
      } else {
        setLookupResult(data);
      }
    } catch {
      setLookupError("Provera trenutno nije dostupna.");
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <nav className="mb-4 text-xs text-slate-500">
        <Link href="/" className="hover:text-[#0f807f]">
          Početna
        </Link>{" "}
        /{" "}
        <span className="font-semibold text-slate-800">
          Reklamacije i odustanak od ugovora (14 dana)
        </span>
      </nav>

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <span className="inline-block rounded bg-teal-50 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-[#0f807f]">
          Zakon o zaštiti potrošača RS
        </span>
        <h1 className="mt-2 text-2xl font-extrabold text-[#101c32] sm:text-3xl">
          Online podnošenje reklamacije (24 meseca) ili odustanka od kupovine (14 dana)
        </h1>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
          Svaki zahtev se automatski zavodi u elektronsku evidenciju sa jedinstvenim{" "}
          <strong>RMA brojem</strong>. Zakonski rok za odgovor trgovca iznosi{" "}
          <strong>8 kalendarskih dana</strong>, a za rešavanje reklamacije{" "}
          <strong>15 dana</strong>.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-extrabold text-[#101c32] mb-4">
              1. Podnesite novi zahtev (RMA)
            </h2>

            {submitError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-800">
                {submitError}
              </div>
            )}

            {submitMessage && (
              <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900">
                <div className="font-extrabold text-sm mb-1">
                  Zahtev uspešno zaveden: {createdRmaNumber}
                </div>
                <p>{submitMessage}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Broj porudžbine *
                  </label>
                  <input
                    type="text"
                    required
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    placeholder="ORD-2026..."
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Vrsta zahteva *
                  </label>
                  <select
                    value={returnType}
                    onChange={(e) => setReturnType(e.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="Withdrawal14Days">
                      Odustanak od ugovora na daljinu (rok 14 dana)
                    </option>
                    <option value="WarrantyClaim24Months">
                      Reklamacija na nesaobraznost / garanciju (24 meseca)
                    </option>
                    <option value="DamagedInTransit">
                      Oštećenje paketa u transportu
                    </option>
                  </select>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Ime i prezime *
                  </label>
                  <input
                    type="text"
                    required
                    value={customerFullName}
                    onChange={(e) => setCustomerFullName(e.target.value)}
                    placeholder="Marko Petrović"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Telefon za kontakt *
                  </label>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="0641234567"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Naziv ili šifra artikla (SKU) *
                  </label>
                  <input
                    type="text"
                    required
                    value={productSkuOrName}
                    onChange={(e) => setProductSkuOrName(e.target.value)}
                    placeholder="npr. INT-AKU-18V-01"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Količina *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Email adresa
                  </label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="kupac@primer.rs"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Tekući račun za povrat novca (18 cifara)
                  </label>
                  <input
                    type="text"
                    value={customerBankAccount}
                    onChange={(e) => setCustomerBankAccount(e.target.value)}
                    placeholder="160-0000001234567-89"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Opis nesaobraznosti ili napomena uz odustanak *
                </label>
                <textarea
                  rows={3}
                  required
                  value={reasonDescription}
                  onChange={(e) => setReasonDescription(e.target.value)}
                  placeholder="Opišite primećeni problem ili navedite da odustajete od ugovora u zakonskom roku od 14 dana..."
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-[#0f807f] px-5 py-2.5 text-sm font-extrabold text-white hover:bg-teal-700 transition disabled:opacity-50"
              >
                {submitting ? "Zavođenje zahteva..." : "Pošalji zahtev i preuzmi RMA broj"}
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-extrabold text-[#101c32] mb-2">
              2. Provera statusa reklamacije (RMA)
            </h2>
            <p className="text-xs text-slate-600 mb-4">
              Unesite vaš RMA broj (npr. <code>RMA-20261113-1234</code>) za uvid u zakonski rok i odluku servisa.
            </p>

            <form onSubmit={handleLookup} className="flex gap-2">
              <input
                type="text"
                required
                value={lookupRma}
                onChange={(e) => setLookupRma(e.target.value)}
                placeholder="RMA-2026..."
                className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="rounded-md bg-[#101c32] px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
              >
                Proveri
              </button>
            </form>

            {lookupError && (
              <div className="mt-3 rounded border border-red-200 bg-red-50 p-2.5 text-xs text-red-800">
                {lookupError}
              </div>
            )}

            {lookupResult && (
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs space-y-2">
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="font-bold text-[#101c32]">{lookupResult.rmaNumber}</span>
                  <span className="rounded bg-teal-100 px-2 py-0.5 font-bold text-teal-900">
                    {lookupResult.status}
                  </span>
                </div>
                <div>
                  Porudžbina: <strong>{lookupResult.orderNumber}</strong>
                </div>
                <div>
                  Artikal: <strong>{lookupResult.quantity}x {lookupResult.productSkuOrName}</strong>
                </div>
                <div>
                  Rok za odgovor (8 dana):{" "}
                  <strong>
                    {new Date(lookupResult.statutoryResponseDeadlineAt).toLocaleDateString("sr-RS")}
                  </strong>
                </div>
                <div>
                  Rok za rešenje (15 dana):{" "}
                  <strong>
                    {new Date(lookupResult.statutoryResolutionDeadlineAt).toLocaleDateString("sr-RS")}
                  </strong>
                </div>
                {lookupResult.officialDecisionNote && (
                  <div className="mt-2 rounded bg-white p-2.5 border border-slate-200">
                    <div className="font-bold text-slate-800">Zvaničan odgovor trgovca:</div>
                    <p className="mt-1 text-slate-600">{lookupResult.officialDecisionNote}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

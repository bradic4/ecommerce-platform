"use client";

import React, { useState } from "react";
import { API_BASE_URL, ProductReviewDto } from "@/lib/api";

interface Props {
  productSlug: string;
  initialReviews: ProductReviewDto[];
  aggregateRating?: {
    ratingValue: number;
    reviewCount: number;
  };
}

export function ProductReviewsSection({
  productSlug,
  initialReviews,
  aggregateRating,
}: Props) {
  const [reviews, setReviews] = useState<ProductReviewDto[]>(initialReviews);
  const [authorName, setAuthorName] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorName.trim() || !comment.trim()) return;

    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/products/${encodeURIComponent(productSlug)}/reviews`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            authorName,
            orderNumber: orderNumber || null,
            rating,
            title,
            comment,
          }),
        }
      );
      const data = await res.json();
      if (res.ok) {
        setFeedback(data.message);
        setReviews([
          {
            id: data.id || String(Date.now()),
            authorName,
            isVerifiedPurchase: Boolean(data.isVerifiedPurchase),
            rating,
            title: title || "Utisak kupca",
            comment,
            createdAt: new Date().toISOString(),
          },
          ...reviews,
        ]);
        setAuthorName("");
        setOrderNumber("");
        setTitle("");
        setComment("");
      } else {
        setFeedback(data?.message || "Greška pri slanju utiska.");
      }
    } catch {
      setFeedback("Server trenutno nije dostupan.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mt-10 rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-lg font-extrabold text-[#101c32]">
            Utisci kupaca i stručna pitanja ({reviews.length})
          </h2>
          <p className="text-xs text-slate-600">
            Recenzije kupaca sa brojem porudžbine dobijaju oznaku verifikovane kupovine.
          </p>
        </div>
        {aggregateRating && (
          <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3.5 py-2">
            <span className="text-lg font-extrabold text-amber-700">
              ★ {aggregateRating.ratingValue.toFixed(1)} / 5.0
            </span>
            <span className="text-xs text-amber-900">
              ({aggregateRating.reviewCount} ocena)
            </span>
          </div>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-7">
          {reviews.length === 0 ? (
            <p className="text-xs text-slate-500">
              Budite prvi koji će ostaviti utisak ili postaviti tehničko pitanje za ovaj uređaj.
            </p>
          ) : (
            reviews.map((rev) => (
              <article
                key={rev.id}
                className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <strong className="text-slate-900">{rev.authorName}</strong>
                    <span className="font-bold text-amber-600">
                      {"★".repeat(rev.rating)}
                    </span>
                  </div>
                  {rev.isVerifiedPurchase && (
                    <span className="rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                      ✓ Verifikovana kupovina
                    </span>
                  )}
                </div>
                <h3 className="mt-1.5 font-bold text-[#101c32] text-sm">
                  {rev.title}
                </h3>
                <p className="mt-1 text-slate-700 leading-relaxed">
                  {rev.comment}
                </p>
                {rev.adminTechnicalReply && (
                  <div className="mt-3 rounded border-l-4 border-[#0f807f] bg-white p-3">
                    <div className="font-bold text-[#0f807f]">
                      Odgovor tehničke podrške (Alati &amp; Domaćinstvo):
                    </div>
                    <p className="mt-1 text-slate-600">
                      {rev.adminTechnicalReply}
                    </p>
                  </div>
                )}
              </article>
            ))
          )}
        </div>

        <div className="lg:col-span-5">
          <form
            onSubmit={handleSubmit}
            className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs"
          >
            <h3 className="font-extrabold text-[#101c32] text-sm">
              Ostavite utisak ili postavite pitanje
            </h3>

            {feedback && (
              <div className="rounded border border-teal-200 bg-teal-50 p-2.5 font-semibold text-teal-900">
                {feedback}
              </div>
            )}

            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <label className="mb-1 block font-bold text-slate-700">
                  Vaše ime i mesto *
                </label>
                <input
                  type="text"
                  required
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="npr. Milan P. (Niš)"
                  className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5"
                />
              </div>
              <div>
                <label className="mb-1 block font-bold text-slate-700">
                  Broj porudžbine (za verifikaciju)
                </label>
                <input
                  type="text"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  placeholder="ORD-2026..."
                  className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5"
                />
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <div>
                <label className="mb-1 block font-bold text-slate-700">
                  Ocena
                </label>
                <select
                  value={rating}
                  onChange={(e) => setRating(Number(e.target.value))}
                  className="w-full rounded border border-slate-300 bg-white px-2 py-1.5"
                >
                  <option value={5}>5 ★ (Odlično)</option>
                  <option value={4}>4 ★ (Vrlo dobro)</option>
                  <option value={3}>3 ★ (Korektno)</option>
                  <option value={2}>2 ★ (Slabo)</option>
                  <option value={1}>1 ★ (Loše)</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block font-bold text-slate-700">
                  Kratak naslov
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="npr. Odlična snaga za radionicu"
                  className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block font-bold text-slate-700">
                Vaš komentar ili pitanje *
              </label>
              <textarea
                rows={3}
                required
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Napišite kako se alat pokazao u radu ili postavite tehničko pitanje..."
                className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded bg-[#101c32] px-4 py-2 font-bold text-white hover:bg-slate-800 transition"
            >
              {submitting ? "Slanje..." : "Objavi utisak / pitanje"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

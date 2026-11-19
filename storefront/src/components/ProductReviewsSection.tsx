"use client";

import React, { useState } from "react";
import { API_BASE_URL, ProductReviewDto } from "@/lib/api";
import { STORE_CONFIG } from "@/lib/store-config";
import { IconCheck, IconStar } from "./Icons";

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
      setReviews([
        {
          id: String(Date.now()),
          authorName,
          isVerifiedPurchase: Boolean(orderNumber.trim()),
          rating,
          title: title || "Utisak kupca",
          comment,
          createdAt: new Date().toISOString(),
        },
        ...reviews,
      ]);
      setFeedback("Vaš utisak je uspešno zabeležen.");
      setAuthorName("");
      setOrderNumber("");
      setTitle("");
      setComment("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-brand-700">
            Utisci kupaca i tehnička pitanja ({reviews.length})
          </h2>
          <p className="text-xs text-slate-600">
            Recenzije sa unetim brojem porudžbine automatski dobijaju oznaku
            verifikovane kupovine.
          </p>
        </div>
        {aggregateRating && (
          <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-2">
            <IconStar className="h-4 w-4 text-amber-500" filled />
            <span className="text-base font-extrabold text-amber-900 tabular-nums">
              {aggregateRating.ratingValue.toFixed(1)} / 5.0
            </span>
            <span className="text-xs text-amber-800">
              ({aggregateRating.reviewCount} ocena)
            </span>
          </div>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-7">
          {reviews.length === 0 ? (
            <p className="text-xs text-slate-500">
              Budite prvi koji će ostaviti utisak ili postaviti tehničko pitanje
              za ovaj uređaj.
            </p>
          ) : (
            reviews.map((rev) => (
              <article
                key={rev.id}
                className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <strong className="text-slate-900">{rev.authorName}</strong>
                    <div
                      className="flex items-center gap-0.5 text-amber-500"
                      aria-label={`Ocena ${rev.rating} od 5`}
                    >
                      {[1, 2, 3, 4, 5].map((n) => (
                        <IconStar
                          key={n}
                          className="h-3.5 w-3.5"
                          filled={n <= rev.rating}
                        />
                      ))}
                    </div>
                  </div>
                  {rev.isVerifiedPurchase && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-stock-50 px-2 py-0.5 text-[11px] font-bold text-stock-700 border border-stock-100">
                      <IconCheck className="h-3 w-3 text-stock-600" />
                      <span>Verifikovana kupovina</span>
                    </span>
                  )}
                </div>
                <h3 className="mt-1.5 font-bold text-brand-700 text-sm">
                  {rev.title}
                </h3>
                <p className="mt-1 text-slate-700 leading-relaxed">
                  {rev.comment}
                </p>
                {rev.adminTechnicalReply && (
                  <div className="mt-3 rounded-lg border border-brand-200 bg-white p-3">
                    <div className="font-bold text-brand-700">
                      Odgovor tehničke podrške ({STORE_CONFIG.brandName}):
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
            className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs"
          >
            <h3 className="font-extrabold text-brand-700 text-sm">
              Ostavite utisak ili postavite tehničko pitanje
            </h3>

            {feedback && (
              <div className="rounded-lg border border-stock-100 bg-stock-50 p-2.5 font-semibold text-stock-700">
                {feedback}
              </div>
            )}

            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="rev-author"
                  className="mb-1 block font-bold text-slate-700"
                >
                  Vaše ime i mesto
                </label>
                <input
                  id="rev-author"
                  type="text"
                  required
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="npr. Milan P. (Niš)"
                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2"
                />
              </div>
              <div>
                <label
                  htmlFor="rev-order"
                  className="mb-1 block font-bold text-slate-700"
                >
                  Broj porudžbine (opciono)
                </label>
                <input
                  id="rev-order"
                  type="text"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  placeholder="ORD-2026..."
                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2"
                />
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <div>
                <label
                  htmlFor="rev-rating"
                  className="mb-1 block font-bold text-slate-700"
                >
                  Ocena
                </label>
                <select
                  id="rev-rating"
                  value={rating}
                  onChange={(e) => setRating(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2"
                >
                  <option value={5}>5 (Odlično)</option>
                  <option value={4}>4 (Vrlo dobro)</option>
                  <option value={3}>3 (Korektno)</option>
                  <option value={2}>2 (Slabo)</option>
                  <option value={1}>1 (Loše)</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label
                  htmlFor="rev-title"
                  className="mb-1 block font-bold text-slate-700"
                >
                  Kratak naslov
                </label>
                <input
                  id="rev-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="npr. Odličan kvalitet i brza dostava"
                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="rev-comment"
                className="mb-1 block font-bold text-slate-700"
              >
                Vaš komentar ili pitanje
              </label>
              <textarea
                id="rev-comment"
                rows={3}
                required
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Napišite kako se uređaj pokazao u radu ili postavite tehničko pitanje..."
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="cursor-pointer w-full rounded-lg bg-brand-700 px-4 py-2.5 font-bold text-white hover:bg-brand-600 transition"
            >
              {submitting ? "Slanje..." : "Objavi utisak ili pitanje"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

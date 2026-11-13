import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL } from "@/lib/api";
import { STATIC_BUYING_GUIDES } from "@/lib/guides";

export const metadata: Metadata = {
  title: "Vodiči za kupovinu i stručni saveti | Alati & Domaćinstvo",
  description:
    "Praktični tehnički vodiči za izbor električnog i akumulatorskog alata, aparata za varenje i opreme za održavanje dvorišta.",
  alternates: {
    canonical: `${SITE_URL}/vodici`,
  },
};

export default function BuyingGuidesHubPage() {
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Početna",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Vodiči za kupovinu",
        item: `${SITE_URL}/vodici`,
      },
    ],
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <nav className="mb-4 text-xs text-slate-500">
        <Link href="/" className="hover:text-[#0f807f]">
          Početna
        </Link>{" "}
        / <span className="font-semibold text-slate-800">Vodiči za kupovinu</span>
      </nav>

      <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <span className="inline-block rounded bg-teal-50 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-[#0f807f]">
          Baza znanja i stručni saveti
        </span>
        <h1 className="mt-2 text-2xl font-extrabold text-[#101c32] sm:text-3xl">
          Vodiči za izbor alata i opreme za domaćinstvo
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600 leading-relaxed">
          Pre kupovine proverite realne tehničke parametre: obrtni moment (Nm),
          radni ciklus (intermitenciju), tip motora i savete za održavanje kako
          biste odabrali uređaj koji zaista odgovara vašem poslu.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {STATIC_BUYING_GUIDES.map((guide) => (
          <article
            key={guide.slug}
            className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-teal-600/40 hover:shadow-md"
          >
            <div>
              <div className="mb-3 flex items-center justify-between text-xs text-slate-500">
                <Link
                  href={`/kategorija/${guide.categorySlug}`}
                  className="font-semibold text-[#0f807f] hover:underline"
                >
                  {guide.categoryName}
                </Link>
                <span>{guide.readingTimeMinutes} min čitanja</span>
              </div>

              <h2 className="mb-2 text-lg font-bold text-[#101c32] leading-snug">
                <Link
                  href={`/vodici/${guide.slug}`}
                  className="hover:text-[#0f807f] transition"
                >
                  {guide.title}
                </Link>
              </h2>

              <p className="mb-4 text-xs text-slate-600 leading-relaxed">
                {guide.excerpt}
              </p>
            </div>

            <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Objavljeno: {guide.publishedAt}
              </span>
              <Link
                href={`/vodici/${guide.slug}`}
                className="text-xs font-bold text-[#101c32] hover:text-[#0f807f]"
              >
                Pročitaj vodič &rarr;
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

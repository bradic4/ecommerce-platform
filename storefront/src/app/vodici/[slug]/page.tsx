import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/ProductCard";
import { fetchCatalogProducts, SITE_URL } from "@/lib/api";
import { STATIC_BUYING_GUIDES } from "@/lib/guides";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const guide = STATIC_BUYING_GUIDES.find((g) => g.slug === slug);
  if (!guide) {
    return { title: "Vodič nije pronađen" };
  }

  return {
    title: guide.seoTitle,
    description: guide.seoDescription,
    alternates: {
      canonical: `${SITE_URL}/vodici/${guide.slug}`,
    },
  };
}

export default async function BuyingGuideDetailPage({ params }: Props) {
  const { slug } = await params;
  const guide = STATIC_BUYING_GUIDES.find((g) => g.slug === slug);

  if (!guide) {
    notFound();
  }

  const relatedProducts = await fetchCatalogProducts({
    q: guide.relatedQuery,
  });

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    description: guide.seoDescription,
    datePublished: guide.publishedAt,
    author: {
      "@type": "Organization",
      name: "Alati & Domaćinstvo",
    },
    mainEntityOfPage: `${SITE_URL}/vodici/${guide.slug}`,
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: guide.faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.answer,
      },
    })),
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <nav className="mb-4 text-xs text-slate-500">
        <Link href="/" className="hover:text-[#0f807f]">
          Početna
        </Link>{" "}
        /{" "}
        <Link href="/vodici" className="hover:text-[#0f807f]">
          Vodiči za kupovinu
        </Link>{" "}
        / <span className="font-semibold text-slate-800">{guide.title}</span>
      </nav>

      <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <Link
            href={`/kategorija/${guide.categorySlug}`}
            className="rounded bg-teal-50 px-2.5 py-1 font-bold text-[#0f807f]"
          >
            {guide.categoryName}
          </Link>
          <span>Objavljeno: {guide.publishedAt}</span>
          <span>•</span>
          <span>{guide.readingTimeMinutes} min čitanja</span>
        </div>

        <h1 className="text-2xl font-extrabold text-[#101c32] sm:text-3xl leading-tight">
          {guide.title}
        </h1>

        <p className="mt-3 text-base text-slate-600 leading-relaxed border-l-4 border-[#0f807f] pl-4">
          {guide.excerpt}
        </p>

        <div className="mt-6 space-y-6">
          {guide.sections.map((sec, idx) => (
            <section key={idx}>
              <h2 className="text-lg font-bold text-[#101c32] mb-2">
                {sec.heading}
              </h2>
              <p className="text-sm text-slate-700 leading-relaxed">
                {sec.body}
              </p>
            </section>
          ))}
        </div>

        {guide.faqs.length > 0 && (
          <div className="mt-8 border-t border-slate-200 pt-6">
            <h2 className="text-lg font-bold text-[#101c32] mb-4">
              Često postavljana pitanja (FAQ)
            </h2>
            <div className="space-y-4">
              {guide.faqs.map((faq, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                >
                  <h3 className="text-sm font-bold text-[#101c32]">
                    {faq.question}
                  </h3>
                  <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </article>

      {relatedProducts.length > 0 && (
        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-[#101c32]">
              Preporučeni proizvodi iz ovog vodiča
            </h2>
            <Link
              href={`/kategorija/${guide.categorySlug}`}
              className="text-xs font-bold text-[#0f807f] hover:underline"
            >
              Pogledaj celu kategoriju &rarr;
            </Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {relatedProducts.slice(0, 3).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

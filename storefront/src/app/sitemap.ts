import type { MetadataRoute } from "next";
import { fetchCatalogProducts, fetchCategories, SITE_URL } from "@/lib/api";
import { STATIC_BUYING_GUIDES } from "@/lib/guides";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, products] = await Promise.all([
    fetchCategories(),
    fetchCatalogProducts(),
  ]);

  const entries: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/vodici`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/uslovi-kupovine`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  for (const guide of STATIC_BUYING_GUIDES) {
    entries.push({
      url: `${SITE_URL}/vodici/${guide.slug}`,
      lastModified: new Date(guide.publishedAt),
      changeFrequency: "monthly",
      priority: 0.7,
    });
  }

  for (const cat of categories) {
    entries.push({
      url: `${SITE_URL}/kategorija/${cat.slug}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    });
  }

  for (const prod of products) {
    entries.push({
      url: `${SITE_URL}/proizvod/${prod.slug}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    });
  }

  return entries;
}

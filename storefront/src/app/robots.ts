import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/api";

// Section 14.1 & 14.2: Disallow cart, checkout, order confirmation, and raw sort/filter parameters
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/checkout", "/potvrda/", "/*?sort=", "/*?inStock="],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}

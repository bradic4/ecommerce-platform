export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5080";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export interface CategoryDto {
  id: string;
  name: string;
  slug: string;
  seoTitle?: string;
  seoDescription?: string;
  introText?: string;
  productCount: number;
}

export interface CatalogProductItemDto {
  id: string;
  name: string;
  slug: string;
  brandName?: string;
  brandSlug?: string;
  categoryName?: string;
  categorySlug?: string;
  shortSpecification?: string;
  variantId?: string;
  sku?: string;
  ean?: string;
  priceRsd: number;
  currency: string;
  isOrderable: boolean;
  ownStockAvailable: boolean;
  availabilityLabel: string;
}

export interface ProductVariantDetailDto {
  id: string;
  internalSku: string;
  title: string;
  gtinEan?: string;
  attributeSummary: string;
  priceRsd: number;
  currency: string;
  isOrderable: boolean;
  ownStockAvailable: boolean;
  publicStatusLabel: string;
  estimatedLeadTimeDays: number;
  schemaAvailability: string;
}

export interface ProductReviewDto {
  id: string;
  authorName: string;
  isVerifiedPurchase: boolean;
  rating: number;
  title: string;
  comment: string;
  adminTechnicalReply?: string;
  createdAt: string;
}

export interface ProductDetailDto {
  id: string;
  name: string;
  slug: string;
  description?: string;
  shortSpecification?: string;
  gtinEan?: string;
  seoTitle?: string;
  seoDescription?: string;
  category?: {
    name: string;
    slug: string;
  };
  variants: ProductVariantDetailDto[];
  aggregateRating?: {
    ratingValue: number;
    reviewCount: number;
  };
  reviews?: ProductReviewDto[];
}

export interface CheckoutItemRequestDto {
  variantId: string;
  quantity: number;
}

export interface CheckoutQuoteLineDto {
  variantId: string;
  internalSku: string;
  productName: string;
  quantity: number;
  unitPriceRsd: number;
  lineTotalRsd: number;
  fulfillmentSource: string;
  publicAvailabilityLabel: string;
  isAvailable: boolean;
}

export interface CheckoutQuoteResponseDto {
  lines: CheckoutQuoteLineDto[];
  subtotalRsd: number;
  discountRsd?: number;
  appliedCouponCode?: string;
  couponMessage?: string;
  shippingCostRsd: number;
  totalRsd: number;
  canProceed: boolean;
  validationError?: string;
}

export function formatRsd(amount: number): string {
  return new Intl.NumberFormat("sr-RS", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount) + " RSD";
}

export async function fetchCategories(): Promise<CategoryDto[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/catalog/categories`, {
      next: { revalidate: 300, tags: ["catalog", "nav"] },
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function fetchCatalogProducts(params?: {
  q?: string;
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: string;
  inStockOnly?: boolean;
}): Promise<CatalogProductItemDto[]> {
  try {
    const url = new URL(`${API_BASE_URL}/api/v1/catalog/products`);
    if (params?.q) url.searchParams.set("q", params.q);
    if (params?.category) url.searchParams.set("category", params.category);
    if (params?.brand) url.searchParams.set("brand", params.brand);
    if (params?.minPrice) url.searchParams.set("minPrice", String(params.minPrice));
    if (params?.maxPrice) url.searchParams.set("maxPrice", String(params.maxPrice));
    if (params?.sort) url.searchParams.set("sort", params.sort);
    if (params?.inStockOnly) url.searchParams.set("inStockOnly", "true");

    const tags = ["catalog"];
    if (params?.category) tags.push(`category:${params.category}`);

    const res = await fetch(url.toString(), {
      // Search & filter queries are dynamic; base catalog uses ISR with tag invalidation (Section 25.6)
      next: params?.q ? { revalidate: 0 } : { revalidate: 300, tags },
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function fetchProductBySlug(
  slug: string
): Promise<ProductDetailDto | null> {
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/v1/products/${encodeURIComponent(slug)}`,
      {
        next: {
          revalidate: 300,
          tags: ["catalog", `product:${slug}`],
        },
      }
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

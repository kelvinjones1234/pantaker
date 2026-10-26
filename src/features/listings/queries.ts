import {
  SAMPLE_CATEGORIES,
  SAMPLE_LISTINGS,
  SAMPLE_PRODUCT_GROUPS,
} from "@/lib/sample-data";
import type { MarketplaceFilters } from "@/lib/validation/listings";
import type { CardListing } from "@/components/marketplace/ListingCard";
import { paginationDefaults } from "@/config/site";
import { deliveryUrl, isImageStorageConfigured } from "@/lib/image-storage";
import { getPrisma, isPrismaConfigured } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import type { Prisma } from "@/generated/prisma/client";

/** Cover image URL for a listing, from its lowest sort_order object key. */
function coverImageUrl(rows: unknown): string | undefined {
  if (
    !isImageStorageConfigured() ||
    !Array.isArray(rows) ||
    rows.length === 0
  ) {
    return undefined;
  }
  const sorted = [
    ...(rows as Array<{ storage_path?: string; sort_order?: number }>),
  ].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const path = sorted[0]?.storage_path;
  if (typeof path !== "string" || !path) return undefined;
  try {
    return deliveryUrl(path);
  } catch {
    return undefined;
  }
}

/** Resolve a category slug to its display name (sample data). */
function sampleCategoryName(slug: string): string | null {
  const found = SAMPLE_CATEGORIES.find(
    (c) => c.slug.toLowerCase() === slug.toLowerCase(),
  );
  return found ? (found.name as string) : null;
}

/** Product groups defined for a sample category slug. Empty in live mode. */
export function sampleProductGroups(categorySlug: string) {
  return SAMPLE_PRODUCT_GROUPS[categorySlug.toLowerCase()] ?? [];
}

function sampleToCards(filters: MarketplaceFilters): {
  items: CardListing[];
  total: number;
} {
  let items = SAMPLE_LISTINGS.map((s) => ({
    id: s.id,
    title: s.title,
    condition: s.condition,
    pricing_type: s.pricing_type,
    price: s.price,
    city: s.city,
    area: s.area,
    category: s.category,
    group: s.group,
    image: s.image,
    created_at: s.created_at,
  }));
  if (filters.q) {
    const q = filters.q.toLowerCase();
    items = items.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        i.category?.toLowerCase().includes(q) ||
        i.area?.toLowerCase().includes(q),
    );
  }
  if (filters.condition)
    items = items.filter((i) => i.condition === filters.condition);
  if (filters.pricing)
    items = items.filter((i) => i.pricing_type === filters.pricing);
  if (filters.category) {
    const name = sampleCategoryName(filters.category);
    items = items.filter((i) =>
      name
        ? i.category?.toLowerCase() === name.toLowerCase()
        : i.category?.toLowerCase() === filters.category.toLowerCase(),
    );
  }
  if (filters.group) items = items.filter((i) => i.group === filters.group);
  if (filters.area) items = items.filter((i) => i.area === filters.area);
  if (filters.minPrice != null)
    items = items.filter((i) => (i.price ?? 0) >= filters.minPrice!);
  if (filters.maxPrice != null)
    items = items.filter((i) => (i.price ?? Infinity) <= filters.maxPrice!);
  if (filters.sort === "price_asc")
    items.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
  else if (filters.sort === "price_desc")
    items.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
  else
    items.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

  const total = items.length;
  const pageSize = paginationDefaults.marketplacePageSize;
  const from = (filters.page - 1) * pageSize;
  return { items: items.slice(from, from + pageSize), total };
}

export async function searchListings(filters: MarketplaceFilters): Promise<{
  items: CardListing[];
  total: number;
  live: boolean;
}> {
  if (!isPrismaConfigured()) {
    return { ...sampleToCards(filters), live: false };
  }

  const prisma = getPrisma();
  const pageSize = paginationDefaults.marketplacePageSize;
  const skip = (filters.page - 1) * pageSize;

  const where: Prisma.ListingWhereInput = { item_status: "published" };
  if (filters.q) {
    where.OR = [
      { title: { contains: filters.q, mode: "insensitive" } },
      { description: { contains: filters.q, mode: "insensitive" } },
      { area: { contains: filters.q, mode: "insensitive" } },
      { city: { contains: filters.q, mode: "insensitive" } },
    ];
  }
  if (filters.category) {
    where.category = { slug: filters.category.toLowerCase() };
  }
  if (filters.condition) where.condition = filters.condition;
  if (filters.pricing) where.pricing_type = filters.pricing;
  if (filters.city)
    where.city = { contains: filters.city, mode: "insensitive" };
  if (filters.area) where.area = filters.area;
  if (filters.minPrice != null) where.price = { gte: filters.minPrice };
  if (filters.maxPrice != null) {
    where.price = {
      ...(where.price as Prisma.IntNullableFilter),
      lte: filters.maxPrice,
    };
  }

  const orderBy: Prisma.ListingOrderByWithRelationInput[] =
    filters.sort === "price_asc" || filters.sort === "price_desc"
      ? [
          {
            price: {
              sort: filters.sort === "price_asc" ? "asc" : "desc",
              nulls: "last",
            },
          },
        ]
      : [{ published_at: { sort: "desc", nulls: "last" } }];

  const [rows, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      orderBy,
      skip,
      take: pageSize,
      select: {
        id: true,
        title: true,
        condition: true,
        pricing_type: true,
        price: true,
        city: true,
        area: true,
        created_at: true,
        category: { select: { name: true } },
        images: {
          select: { storage_path: true, sort_order: true },
          orderBy: { sort_order: "asc" },
        },
      },
    }),
    prisma.listing.count({ where }),
  ]);

  return {
    live: true,
    total,
    items: rows.map((row) => ({
      id: row.id,
      title: row.title,
      condition: row.condition as CardListing["condition"],
      pricing_type: row.pricing_type,
      price: row.price,
      city: row.city,
      area: row.area,
      category: row.category?.name,
      image: coverImageUrl(row.images),
      created_at: row.created_at.toISOString(),
    })),
  };
}

export interface ListingDetail {
  id: string;
  seller_id: string;
  title: string;
  description: string | null;
  condition: CardListing["condition"];
  item_status: import("@/types/marketplace").ItemStatus;
  pricing_type: string;
  price: number | null;
  quantity: number | null;
  quantity_unit: string | null;
  city: string;
  area: string | null;
  pickup_notes: string | null;
  created_at: string;
  category: { name: string; slug: string } | null;
  images: string[];
  seller: {
    id: string;
    display_name: string | null;
    username: string | null;
    avatar_path: string | null;
    city: string | null;
  } | null;
  /** True when the row came from SAMPLE_LISTINGS (local preview only). */
  sample: boolean;
}

/**
 * A single public listing for the detail page. Only published rows are returned;
 * sellers preview drafts through the seller dashboard instead.
 */
export async function getListingDetail(
  id: string,
): Promise<ListingDetail | null> {
  if (!isPrismaConfigured()) {
    const sample = SAMPLE_LISTINGS.find((item) => item.id === id);
    if (!sample) return null;
    return {
      id: sample.id,
      seller_id: "",
      title: sample.title,
      description: null,
      condition: sample.condition,
      item_status: "published",
      pricing_type: sample.pricing_type,
      price: sample.price,
      quantity: null,
      quantity_unit: null,
      city: sample.city,
      area: sample.area ?? null,
      pickup_notes: null,
      created_at: sample.created_at,
      category: { name: sample.category, slug: slugify(sample.category) },
      images: sample.image ? [sample.image] : [],
      seller: null,
      sample: true,
    };
  }

  const row = await getPrisma().listing.findFirst({
    where: { id, item_status: "published" },
    select: {
      id: true,
      seller_id: true,
      title: true,
      description: true,
      condition: true,
      item_status: true,
      pricing_type: true,
      price: true,
      quantity: true,
      quantity_unit: true,
      city: true,
      area: true,
      pickup_notes: true,
      created_at: true,
      category: { select: { name: true, slug: true } },
      images: {
        select: { storage_path: true, sort_order: true },
        orderBy: { sort_order: "asc" },
      },
      seller: {
        select: {
          profile: {
            select: {
              id: true,
              display_name: true,
              username: true,
              avatar_path: true,
              city: true,
            },
          },
        },
      },
    },
  });
  if (!row) return null;

  const images = row.images.flatMap((image) => {
    if (!isImageStorageConfigured() || !image.storage_path) return [];
    try {
      return [deliveryUrl(image.storage_path)];
    } catch {
      return [];
    }
  });

  return {
    id: row.id,
    seller_id: row.seller_id,
    title: row.title,
    description: row.description,
    condition: row.condition as CardListing["condition"],
    item_status: row.item_status as import("@/types/marketplace").ItemStatus,
    pricing_type: row.pricing_type,
    price: row.price,
    quantity: row.quantity === null ? null : Number(row.quantity),
    quantity_unit: row.quantity_unit,
    city: row.city,
    area: row.area,
    pickup_notes: row.pickup_notes,
    created_at: row.created_at.toISOString(),
    category: row.category,
    images,
    seller: row.seller?.profile ?? null,
    sample: false,
  };
}

export async function getCategories() {
  if (!isPrismaConfigured()) {
    const { SAMPLE_CATEGORIES } = await import("@/lib/sample-data");
    return SAMPLE_CATEGORIES.map((c, i) => ({
      id: `00000000-0000-0000-0000-${String(i + 1).padStart(12, "0")}`,
      ...c,
      count: c.count,
      live: false,
    }));
  }

  const categories = await getPrisma().category.findMany({
    where: { is_active: true },
    orderBy: { sort_order: "asc" },
    select: { id: true, name: true, slug: true, description: true },
  });
  return categories.map((c) => ({ ...c, count: "", live: true }));
}

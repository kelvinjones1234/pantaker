import { requireSeller } from "@/features/auth/authorization";
import {
  deliveryUrl,
  isCloudflareImagesConfigured,
} from "@/lib/cloudflare-images";
import { paginationDefaults } from "@/config/site";
import type { Listing, ItemStatus } from "@/types/marketplace";
import type { SellerListingFilters } from "@/lib/validation/listings";
import { getPrisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Seller-scoped reads. Every query filters on the session user's id, so a seller
 * can only ever load rows they own. Callers never pass a seller id.
 */

const listingSelect = {
  id: true,
  seller_id: true,
  category_id: true,
  title: true,
  slug: true,
  description: true,
  condition: true,
  item_status: true,
  pricing_type: true,
  price: true,
  negotiable: true,
  quantity: true,
  quantity_unit: true,
  city: true,
  area: true,
  pickup_notes: true,
  published_at: true,
  expires_at: true,
  created_at: true,
  updated_at: true,
  category: { select: { name: true, slug: true } },
  images: {
    select: {
      id: true,
      listing_id: true,
      storage_path: true,
      alt_text: true,
      sort_order: true,
    },
    orderBy: { sort_order: "asc" as const },
  },
} satisfies Prisma.ListingSelect;

type SellerListingRow = Prisma.ListingGetPayload<{
  select: typeof listingSelect;
}>;

function toListing(row: SellerListingRow): Listing {
  return {
    id: row.id,
    seller_id: row.seller_id,
    category_id: row.category_id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    condition: row.condition as Listing["condition"],
    item_status: row.item_status as ItemStatus,
    pricing_type: row.pricing_type as Listing["pricing_type"],
    price: row.price,
    negotiable: row.negotiable,
    quantity: row.quantity === null ? null : Number(row.quantity),
    quantity_unit: row.quantity_unit,
    city: row.city,
    area: row.area,
    pickup_notes: row.pickup_notes,
    published_at: row.published_at?.toISOString() ?? null,
    expires_at: row.expires_at?.toISOString() ?? null,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
    categories: row.category,
    listing_images: row.images,
  };
}

/** Public delivery URL for a listing's cover image (lowest sort_order), if any. */
export function listingCoverUrl(rows: unknown): string | undefined {
  if (
    !isCloudflareImagesConfigured() ||
    !Array.isArray(rows) ||
    rows.length === 0
  )
    return undefined;
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

/** All listings owned by the signed-in seller, newest first. Empty in preview. */
export async function getSellerListings(): Promise<Listing[]> {
  const user = await requireSeller();
  if (!user) return [];

  const rows = await getPrisma().listing.findMany({
    where: { seller_id: user.id },
    orderBy: { created_at: "desc" },
    select: listingSelect,
  });
  return rows.map(toListing);
}

/** The N most recent listings owned by the seller. Empty in preview. */
export async function getSellerRecentListings(limit = 5): Promise<Listing[]> {
  const user = await requireSeller();
  if (!user) return [];

  const rows = await getPrisma().listing.findMany({
    where: { seller_id: user.id },
    orderBy: { created_at: "desc" },
    take: limit,
    select: listingSelect,
  });
  return rows.map(toListing);
}

/** A single listing, but only if it belongs to the signed-in seller. */
export async function getSellerListing(id: string): Promise<Listing | null> {
  const user = await requireSeller();
  if (!user) return null;

  const row = await getPrisma().listing.findFirst({
    where: { id, seller_id: user.id },
    select: listingSelect,
  });
  return row ? toListing(row) : null;
}

export interface SellerStats {
  total: number;
  published: number;
  pendingReview: number;
  draft: number;
  sold: number;
  archived: number;
  rejected: number;
  /** Real count of enquiries received against this seller's listings. */
  enquiries: number;
}

/**
 * Dashboard counters for the signed-in seller. All values are read from real
 * rows scoped to the session — nothing is hardcoded.
 */
export async function getSellerStats(): Promise<SellerStats> {
  const user = await requireSeller();
  if (!user) {
    return {
      total: 0,
      published: 0,
      pendingReview: 0,
      draft: 0,
      sold: 0,
      archived: 0,
      rejected: 0,
      enquiries: 0,
    };
  }

  const prisma = getPrisma();
  const [groups, total, enquiries] = await Promise.all([
    prisma.listing.groupBy({
      by: ["item_status"],
      where: { seller_id: user.id },
      _count: { _all: true },
    }),
    prisma.listing.count({ where: { seller_id: user.id } }),
    prisma.inquiry.count({ where: { seller_id: user.id } }),
  ]);

  const byStatus = new Map(
    groups.map((group) => [group.item_status, group._count._all]),
  );
  return {
    total,
    published: byStatus.get("published") ?? 0,
    pendingReview: byStatus.get("pending_review") ?? 0,
    draft: byStatus.get("draft") ?? 0,
    sold: byStatus.get("sold") ?? 0,
    archived: byStatus.get("archived") ?? 0,
    rejected: byStatus.get("rejected") ?? 0,
    enquiries,
  };
}

export interface SellerAttentionItem {
  id: string;
  title: string;
  message: string;
  tone: "neutral" | "danger";
  /** Link to the filtered listing list so the seller can act. */
  href: string;
}

/**
 * Real issues only, derived from the seller's own rows: moderation asked for
 * changes, a listing has no photo, or a priced listing is missing its price.
 * Nothing speculative is surfaced.
 */
export async function getSellerAttention(
  limit = 5,
): Promise<SellerAttentionItem[]> {
  const user = await requireSeller();
  if (!user) return [];

  const rows = await getPrisma().listing.findMany({
    where: { seller_id: user.id },
    orderBy: { updated_at: "desc" },
    take: 50,
    select: {
      id: true,
      title: true,
      item_status: true,
      pricing_type: true,
      price: true,
      images: { select: { id: true } },
    },
  });

  const issues: SellerAttentionItem[] = [];
  for (const row of rows) {
    if (row.item_status === "rejected") {
      issues.push({
        id: row.id,
        title: row.title,
        message: "Changes were requested during review.",
        tone: "danger",
        href: "/seller/listings?status=rejected",
      });
    } else if (row.images.length === 0) {
      issues.push({
        id: row.id,
        title: row.title,
        message: "Add at least one photo so buyers can see the item.",
        tone: "neutral",
        href: "/seller/listings",
      });
    } else if (
      (row.pricing_type === "fixed" || row.pricing_type === "negotiable") &&
      row.price == null
    ) {
      issues.push({
        id: row.id,
        title: row.title,
        message: "This listing still needs a price.",
        tone: "neutral",
        href: "/seller/listings",
      });
    }
    if (issues.length >= limit) break;
  }
  return issues;
}

export interface SellerListingPage {
  items: Listing[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Paginated, seller-scoped listing query for My Listings. Filtering, sorting,
 * and pagination all happen at the data layer — the browser never receives the
 * seller's whole inventory.
 */
export async function getSellerListingsPage(
  filters: SellerListingFilters,
): Promise<SellerListingPage> {
  const pageSize = paginationDefaults.dashboardPageSize;
  const empty: SellerListingPage = { items: [], total: 0, page: 1, pageSize };

  const user = await requireSeller();
  if (!user) return empty;

  const where: Prisma.ListingWhereInput = { seller_id: user.id };
  if (filters.status) where.item_status = filters.status;
  if (filters.category) where.category_id = filters.category;
  if (filters.q) where.title = { contains: filters.q, mode: "insensitive" };

  const sortColumns: Record<
    SellerListingFilters["sort"],
    Prisma.ListingOrderByWithRelationInput
  > = {
    newest: { created_at: "desc" },
    oldest: { created_at: "asc" },
    updated: { updated_at: "desc" },
    price_asc: { price: { sort: "asc", nulls: "last" } },
    price_desc: { price: { sort: "desc", nulls: "last" } },
    title_asc: { title: "asc" },
  };

  const [rows, total] = await Promise.all([
    getPrisma().listing.findMany({
      where,
      orderBy: sortColumns[filters.sort],
      skip: (filters.page - 1) * pageSize,
      take: pageSize,
      select: listingSelect,
    }),
    getPrisma().listing.count({ where }),
  ]);

  return {
    items: rows.map(toListing),
    total,
    page: filters.page,
    pageSize,
  };
}

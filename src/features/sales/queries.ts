import { requireSeller } from "@/features/auth/authorization";
import type { ItemStatus, Sale, SaleStatus } from "@/types/marketplace";
import { getPrisma } from "@/lib/prisma";
import { ACTIVE_SALE_STATUSES } from "@/features/sales/lifecycle";
import type { Sale as PrismaSale } from "@/generated/prisma/client";

/**
 * Seller-scoped sales reads. Every query filters on the session user's id, so a
 * seller can only ever load sales they own. Ids are never accepted from callers.
 */

export interface SaleListingRef {
  id: string;
  title: string;
  slug: string;
  item_status: ItemStatus;
  category_slug: string | null;
}

export interface SaleBuyerRef {
  id: string;
  display_name: string | null;
  username: string | null;
}

export interface SaleEnquiryRef {
  id: string;
  message: string;
  created_at: string;
  buyer_id: string;
}

export interface SaleView extends Sale {
  listing: SaleListingRef | null;
  buyer: SaleBuyerRef | null;
}

export interface SaleDetailView extends SaleView {
  enquiry: SaleEnquiryRef | null;
}

export interface SellerSalesSummary {
  items: SaleView[];
  counts: Record<SaleStatus | "all", number>;
}

const EMPTY_COUNTS: Record<SaleStatus | "all", number> = {
  all: 0,
  awaiting_confirmation: 0,
  reserved: 0,
  collection_arranged: 0,
  completed: 0,
  cancelled: 0,
};

function unique(values: Array<string | null | undefined>): string[] {
  return [
    ...new Set(
      values.filter(
        (value): value is string =>
          typeof value === "string" && value.length > 0,
      ),
    ),
  ];
}

function toSale(row: PrismaSale): Sale {
  return {
    id: row.id,
    listing_id: row.listing_id,
    seller_id: row.seller_id,
    buyer_id: row.buyer_id,
    buyer_label: row.buyer_label,
    source_inquiry_id: row.source_inquiry_id,
    agreed_price: row.agreed_price,
    status: row.status as SaleStatus,
    collection_notes: row.collection_notes,
    completed_at: row.completed_at?.toISOString() ?? null,
    cancelled_at: row.cancelled_at?.toISOString() ?? null,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

async function loadBuyers(ids: string[]): Promise<Map<string, SaleBuyerRef>> {
  const map = new Map<string, SaleBuyerRef>();
  if (ids.length === 0) return map;
  const rows = await getPrisma().profile.findMany({
    where: { id: { in: unique(ids) } },
    select: { id: true, display_name: true, username: true },
  });
  for (const row of rows) map.set(row.id, row);
  return map;
}

async function loadListings(
  ids: string[],
): Promise<Map<string, SaleListingRef>> {
  const map = new Map<string, SaleListingRef>();
  if (ids.length === 0) return map;
  const rows = await getPrisma().listing.findMany({
    where: { id: { in: unique(ids) } },
    select: {
      id: true,
      title: true,
      slug: true,
      item_status: true,
      category: { select: { slug: true } },
    },
  });
  for (const row of rows) {
    map.set(row.id, {
      id: row.id,
      title: row.title,
      slug: row.slug,
      item_status: row.item_status as ItemStatus,
      category_slug: row.category?.slug ?? null,
    });
  }
  return map;
}

/** All sales for the signed-in seller (newest first) plus real status counts. */
export async function getSellerSales(): Promise<SellerSalesSummary> {
  const user = await requireSeller();
  if (!user) return { items: [], counts: { ...EMPTY_COUNTS } };

  const rows = await getPrisma().sale.findMany({
    where: { seller_id: user.id },
    orderBy: { created_at: "desc" },
    take: 200,
  });

  const sales = rows.map(toSale);
  const [buyers, listings] = await Promise.all([
    loadBuyers(unique(sales.map((row) => row.buyer_id))),
    loadListings(unique(sales.map((row) => row.listing_id))),
  ]);

  const items: SaleView[] = sales.map((row) => ({
    ...row,
    listing: listings.get(row.listing_id) ?? null,
    buyer: row.buyer_id ? (buyers.get(row.buyer_id) ?? null) : null,
  }));

  const counts = { ...EMPTY_COUNTS, all: items.length };
  for (const item of items) counts[item.status] += 1;

  return { items, counts };
}

/** A single sale, but only if it belongs to the signed-in seller. */
export async function getSellerSale(
  id: string,
): Promise<SaleDetailView | null> {
  const user = await requireSeller();
  if (!user) return null;

  const prisma = getPrisma();
  const row = await prisma.sale.findFirst({
    where: { id, seller_id: user.id },
    include: {
      source_inquiry: {
        select: { id: true, message: true, created_at: true, buyer_id: true },
      },
    },
  });
  if (!row) return null;

  const sale = toSale(row);
  const [buyers, listings] = await Promise.all([
    loadBuyers(unique([sale.buyer_id])),
    loadListings(unique([sale.listing_id])),
  ]);

  const enquiry = row.source_inquiry
    ? {
        id: row.source_inquiry.id,
        message: row.source_inquiry.message,
        created_at: row.source_inquiry.created_at.toISOString(),
        buyer_id: row.source_inquiry.buyer_id,
      }
    : null;

  return {
    ...sale,
    listing: listings.get(sale.listing_id) ?? null,
    buyer: sale.buyer_id ? (buyers.get(sale.buyer_id) ?? null) : null,
    enquiry,
  };
}

export interface SaleListingOption {
  id: string;
  title: string;
  item_status: ItemStatus;
  /** Already has an in-progress sale, so it cannot be sold again yet. */
  hasActiveSale: boolean;
}

/**
 * The seller's sellable listings, each flagged with whether an active sale
 * already exists. A listing with an active sale is shown but cannot be chosen
 * again — the constraint is surfaced rather than hidden.
 */
export async function getSellerSaleOptions(): Promise<SaleListingOption[]> {
  const user = await requireSeller();
  if (!user) return [];

  const prisma = getPrisma();
  const rows = await prisma.listing.findMany({
    where: { seller_id: user.id, item_status: { not: "archived" } },
    orderBy: { updated_at: "desc" },
    take: 200,
    select: { id: true, title: true, item_status: true },
  });
  if (rows.length === 0) return [];

  const activeRows = await prisma.sale.findMany({
    where: {
      seller_id: user.id,
      status: { in: [...ACTIVE_SALE_STATUSES] },
      listing_id: { in: rows.map((row) => row.id) },
    },
    select: { listing_id: true },
  });

  const active = new Set(activeRows.map((row) => row.listing_id));

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    item_status: row.item_status as ItemStatus,
    hasActiveSale: active.has(row.id),
  }));
}

export interface EnquiryOption {
  id: string;
  listing_id: string;
  buyer_id: string;
  buyer_name: string | null;
  message: string;
  created_at: string;
}

/** Open/replied enquiries received against the seller's listings. */
export async function getSellerEnquiryOptions(): Promise<EnquiryOption[]> {
  const user = await requireSeller();
  if (!user) return [];

  const rows = await getPrisma().inquiry.findMany({
    where: { seller_id: user.id, status: { not: "closed" } },
    orderBy: { created_at: "desc" },
    take: 100,
    select: {
      id: true,
      listing_id: true,
      buyer_id: true,
      message: true,
      created_at: true,
    },
  });
  if (rows.length === 0) return [];

  const buyers = await loadBuyers(unique(rows.map((row) => row.buyer_id)));
  return rows.map((row) => ({
    ...row,
    buyer_name: buyers.get(row.buyer_id)?.display_name ?? null,
    created_at: row.created_at.toISOString(),
  }));
}

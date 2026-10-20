import { ADMIN_PAGE_SIZE } from "@/features/admin/list-params";
import {
  LISTING_STATUS_LABELS,
  REPORT_STATUSES,
  type AdminReportStatus,
} from "@/features/admin/moderation-rules";
import { getPrisma, isPrismaConfigured } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { ItemStatus } from "@/types/marketplace";

const LISTING_STATUSES: ItemStatus[] = [
  "draft",
  "pending_review",
  "published",
  "rejected",
  "sold",
  "archived",
];

export interface AdminListingRow {
  id: string;
  title: string;
  slug: string;
  item_status: ItemStatus;
  pricing_type: string;
  price: number | null;
  city: string;
  area: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  seller_id: string;
  category: string | null;
}

export interface AdminReportRow {
  id: string;
  reporter_id: string;
  reporter_name: string | null;
  reported_user_id: string | null;
  reported_name: string | null;
  listing_id: string | null;
  listing_title: string | null;
  listing_slug: string | null;
  listing_status: ItemStatus | null;
  conversation_id: string | null;
  reason: string;
  details: string | null;
  status: AdminReportStatus;
  resolution_note: string | null;
  resolved_at: string | null;
  created_at: string;
}

function safeSearchTerm(q: string): string {
  return q
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

export type AdminListingResult =
  | {
      ok: true;
      rows: AdminListingRow[];
      counts: Record<ItemStatus | "all", number>;
      total: number;
      page: number;
      pageSize: number;
    }
  | { ok: false; error: string };

export async function loadAdminListings(input: {
  q: string;
  status: ItemStatus | "";
  page: number;
}): Promise<AdminListingResult> {
  if (!isPrismaConfigured()) {
    return { ok: false, error: "Could not load listings for moderation." };
  }

  try {
    const prisma = getPrisma();
    const where: Prisma.ListingWhereInput = {};
    if (input.status) where.item_status = input.status;
    const term = safeSearchTerm(input.q);
    if (term) where.title = { contains: term, mode: "insensitive" };

    const [rows, total, groups] = await Promise.all([
      prisma.listing.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip: (input.page - 1) * ADMIN_PAGE_SIZE,
        take: ADMIN_PAGE_SIZE,
        select: {
          id: true,
          title: true,
          slug: true,
          item_status: true,
          pricing_type: true,
          price: true,
          city: true,
          area: true,
          published_at: true,
          created_at: true,
          updated_at: true,
          seller_id: true,
          category: { select: { name: true } },
        },
      }),
      prisma.listing.count({ where }),
      prisma.listing.groupBy({
        by: ["item_status"],
        _count: { _all: true },
      }),
    ]);

    const counts = { all: 0 } as Record<ItemStatus | "all", number>;
    for (const status of LISTING_STATUSES) counts[status] = 0;
    for (const group of groups) {
      counts[group.item_status as ItemStatus] = group._count._all;
      counts.all += group._count._all;
    }

    return {
      ok: true,
      rows: rows.map((row) => ({
        id: row.id,
        title: row.title,
        slug: row.slug,
        item_status: row.item_status as ItemStatus,
        pricing_type: row.pricing_type,
        price: row.price,
        city: row.city,
        area: row.area,
        published_at: row.published_at?.toISOString() ?? null,
        created_at: row.created_at.toISOString(),
        updated_at: row.updated_at.toISOString(),
        seller_id: row.seller_id,
        category: row.category?.name ?? null,
      })),
      counts,
      total,
      page: input.page,
      pageSize: ADMIN_PAGE_SIZE,
    };
  } catch {
    return { ok: false, error: "Could not load listings for moderation." };
  }
}

export type AdminReportResult =
  | {
      ok: true;
      rows: AdminReportRow[];
      counts: Record<AdminReportStatus | "all", number>;
      total: number;
      page: number;
      pageSize: number;
    }
  | { ok: false; error: string };

export async function loadAdminReports(input: {
  q: string;
  status: AdminReportStatus | "";
  page: number;
}): Promise<AdminReportResult> {
  if (!isPrismaConfigured()) {
    return { ok: false, error: "Could not load reports." };
  }

  try {
    const prisma = getPrisma();
    const where: Prisma.ReportWhereInput = {};
    if (input.status) where.status = input.status;
    const term = safeSearchTerm(input.q);
    if (term) {
      where.OR = [
        { reason: { contains: term, mode: "insensitive" } },
        { details: { contains: term, mode: "insensitive" } },
      ];
    }

    const [rawRows, total, groups] = await Promise.all([
      prisma.report.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip: (input.page - 1) * ADMIN_PAGE_SIZE,
        take: ADMIN_PAGE_SIZE,
        include: {
          listing: { select: { title: true, slug: true, item_status: true } },
        },
      }),
      prisma.report.count({ where }),
      prisma.report.groupBy({ by: ["status"], _count: { _all: true } }),
    ]);

    const userIds = new Set<string>();
    for (const row of rawRows) {
      userIds.add(row.reporter_id);
      if (row.reported_user_id) userIds.add(row.reported_user_id);
    }

    const names = new Map<string, string | null>();
    if (userIds.size > 0) {
      const profiles = await prisma.profile.findMany({
        where: { id: { in: [...userIds] } },
        select: { id: true, display_name: true, username: true },
      });
      for (const profile of profiles) {
        names.set(
          profile.id,
          profile.display_name ??
            (profile.username ? `@${profile.username}` : null),
        );
      }
    }

    const counts = { all: 0 } as Record<AdminReportStatus | "all", number>;
    for (const status of REPORT_STATUSES) counts[status] = 0;
    for (const group of groups) {
      counts[group.status as AdminReportStatus] = group._count._all;
      counts.all += group._count._all;
    }

    return {
      ok: true,
      rows: rawRows.map((row) => ({
        id: row.id,
        reporter_id: row.reporter_id,
        reporter_name: names.get(row.reporter_id) ?? null,
        reported_user_id: row.reported_user_id,
        reported_name: row.reported_user_id
          ? (names.get(row.reported_user_id) ?? null)
          : null,
        listing_id: row.listing_id,
        listing_title: row.listing?.title ?? null,
        listing_slug: row.listing?.slug ?? null,
        listing_status:
          (row.listing?.item_status as ItemStatus | undefined) ?? null,
        conversation_id: row.conversation_id,
        reason: row.reason,
        details: row.details,
        status: row.status as AdminReportStatus,
        resolution_note: row.resolution_note,
        resolved_at: row.resolved_at?.toISOString() ?? null,
        created_at: row.created_at.toISOString(),
      })),
      counts,
      total,
      page: input.page,
      pageSize: ADMIN_PAGE_SIZE,
    };
  } catch {
    return { ok: false, error: "Could not load reports." };
  }
}

export const MODERATION_LISTING_STATUS_OPTIONS: Array<{
  value: ItemStatus | "";
  label: string;
}> = [
  { value: "", label: "All listings" },
  { value: "pending_review", label: LISTING_STATUS_LABELS.pending_review },
  { value: "published", label: LISTING_STATUS_LABELS.published },
  { value: "rejected", label: LISTING_STATUS_LABELS.rejected },
  { value: "draft", label: LISTING_STATUS_LABELS.draft },
  { value: "sold", label: LISTING_STATUS_LABELS.sold },
  { value: "archived", label: LISTING_STATUS_LABELS.archived },
];

import type { ItemStatus } from "@/types/marketplace";

/**
 * Single source of truth for how a listing status is named, toned, and ordered
 * across the seller surfaces. Tones never introduce a new accent: only the
 * system error colour is allowed for a genuine problem, everything else is the
 * neutral white/hairline pill from DESIGN.md.
 */
export interface ListingStatusMeta {
  value: ItemStatus;
  label: string;
  tone: "neutral" | "danger";
  /** Plain-language meaning shown in the seller UI. */
  description: string;
}

export const LISTING_STATUS_META: Record<ItemStatus, ListingStatusMeta> = {
  draft: {
    value: "draft",
    label: "Draft",
    tone: "neutral",
    description: "Saved privately. Not submitted for review yet.",
  },
  pending_review: {
    value: "pending_review",
    label: "Pending review",
    tone: "neutral",
    description: "Submitted and waiting for moderation.",
  },
  published: {
    value: "published",
    label: "Active",
    tone: "neutral",
    description: "Live and visible in the marketplace.",
  },
  rejected: {
    value: "rejected",
    label: "Needs changes",
    tone: "danger",
    description: "Moderation asked for changes before it can go live.",
  },
  sold: {
    value: "sold",
    label: "Sold",
    tone: "neutral",
    description: "Marked as sold by you.",
  },
  archived: {
    value: "archived",
    label: "Archived",
    tone: "neutral",
    description: "Hidden from the marketplace.",
  },
};

export function listingStatusMeta(status: string | null | undefined): ListingStatusMeta | null {
  if (!status) return null;
  return LISTING_STATUS_META[status as ItemStatus] ?? null;
}

/** Status filters offered on My Listings — only real lifecycle values. */
export const SELLER_STATUS_FILTERS: Array<{ value: ItemStatus | ""; label: string }> = [
  { value: "", label: "All" },
  { value: "published", label: "Active" },
  { value: "pending_review", label: "Pending review" },
  { value: "draft", label: "Draft" },
  { value: "sold", label: "Sold" },
  { value: "archived", label: "Archived" },
  { value: "rejected", label: "Needs changes" },
];

import type { SaleStatus } from "@/types/marketplace";

/**
 * Single source of truth for how a sale status is named and explained. Tones
 * never invent an accent: only the system error colour marks a cancelled sale,
 * everything else uses the neutral white/hairline pill from DESIGN.md. There is
 * deliberately no "paid" label anywhere in the sales system.
 */
export interface SaleStatusMeta {
  value: SaleStatus;
  label: string;
  tone: "neutral" | "danger";
  description: string;
}

export const SALE_STATUS_META: Record<SaleStatus, SaleStatusMeta> = {
  awaiting_confirmation: {
    value: "awaiting_confirmation",
    label: "Awaiting confirmation",
    tone: "neutral",
    description: "You've agreed a sale and are waiting for the buyer to confirm.",
  },
  reserved: {
    value: "reserved",
    label: "Reserved",
    tone: "neutral",
    description: "The buyer confirmed and the item is held for them.",
  },
  collection_arranged: {
    value: "collection_arranged",
    label: "Collection arranged",
    tone: "neutral",
    description: "A time and place to collect has been recorded.",
  },
  completed: {
    value: "completed",
    label: "Completed",
    tone: "neutral",
    description: "The buyer has taken the item.",
  },
  cancelled: {
    value: "cancelled",
    label: "Cancelled",
    tone: "danger",
    description: "The sale fell through.",
  },
};

export function saleStatusMeta(status: string | null | undefined): SaleStatusMeta | null {
  if (!status) return null;
  return SALE_STATUS_META[status as SaleStatus] ?? null;
}

/** Filter tabs offered on the Sales page — real statuses only. */
export const SALE_STATUS_FILTERS: Array<{ value: SaleStatus | ""; label: string }> = [
  { value: "", label: "All" },
  { value: "awaiting_confirmation", label: "Awaiting confirmation" },
  { value: "reserved", label: "Reserved" },
  { value: "collection_arranged", label: "Collection arranged" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

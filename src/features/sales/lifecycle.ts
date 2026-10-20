import type { SaleStatus } from "@/types/marketplace";

/**
 * The seller-driven sale lifecycle. Every status in this table is reachable and
 * meaningful in the current workflow; nothing speculative is modelled. Every
 * sale mutation is validated against this table on the server, so a tampered
 * status value can never move a sale anywhere the UI doesn't offer.
 *
 * Deliberately absent: a "paid" status. Pantaker doesn't process or verify
 * payments, so a sale is never described as paid.
 */

export interface SaleTransition {
  to: SaleStatus;
  label: string;
  tone: "default" | "danger";
  description: string;
  /** Needs an explicit confirmation step before it runs. */
  confirm?: boolean;
  /** Requires collection notes to be recorded as part of the change. */
  requiresCollectionNotes?: boolean;
}

export const SALE_TRANSITIONS: Record<SaleStatus, SaleTransition[]> = {
  awaiting_confirmation: [
    {
      to: "reserved",
      label: "Mark reserved",
      tone: "default",
      description: "The buyer confirmed — hold the item for them.",
    },
    {
      to: "cancelled",
      label: "Cancel sale",
      tone: "danger",
      description: "The sale fell through. The listing stays available.",
      confirm: true,
    },
  ],
  reserved: [
    {
      to: "collection_arranged",
      label: "Record collection",
      tone: "default",
      description: "Add where and when the buyer will collect.",
      requiresCollectionNotes: true,
    },
    {
      to: "completed",
      label: "Mark completed",
      tone: "default",
      description: "The buyer has taken the item.",
      confirm: true,
    },
    {
      to: "cancelled",
      label: "Cancel sale",
      tone: "danger",
      description: "The sale fell through. The listing stays available.",
      confirm: true,
    },
  ],
  collection_arranged: [
    {
      to: "completed",
      label: "Mark completed",
      tone: "default",
      description: "The buyer has taken the item.",
      confirm: true,
    },
    {
      to: "cancelled",
      label: "Cancel sale",
      tone: "danger",
      description: "The sale fell through. The listing stays available.",
      confirm: true,
    },
  ],
  // Terminal states: a completed or cancelled sale is never reopened.
  completed: [],
  cancelled: [],
};

export function transitionsFromSale(from: SaleStatus): SaleTransition[] {
  return SALE_TRANSITIONS[from] ?? [];
}

export function canSaleTransition(from: SaleStatus, to: SaleStatus): boolean {
  return transitionsFromSale(from).some((transition) => transition.to === to);
}

export function findSaleTransition(from: SaleStatus, to: SaleStatus): SaleTransition | undefined {
  return transitionsFromSale(from).find((transition) => transition.to === to);
}

/** Statuses that occupy a listing (only one active sale per listing at a time). */
export const ACTIVE_SALE_STATUSES: readonly SaleStatus[] = [
  "awaiting_confirmation",
  "reserved",
  "collection_arranged",
];

export function isActiveSaleStatus(status: SaleStatus): boolean {
  return ACTIVE_SALE_STATUSES.includes(status);
}

export function isTerminalSaleStatus(status: SaleStatus): boolean {
  return status === "completed" || status === "cancelled";
}

/**
 * A sale can only be opened against a listing that is still sellable. Archived
 * listings are off the market, so no new sale may be recorded against them.
 */
export function canOpenSaleForListing(itemStatus: string): boolean {
  return itemStatus !== "archived";
}

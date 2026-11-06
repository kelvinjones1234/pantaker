import type { ItemStatus } from "@/types/marketplace";

/**
 * The seller-driven half of the listing lifecycle. Moderation (pending_review →
 * published/rejected) is performed outside the app with the service role, so it
 * is intentionally NOT a seller transition here. Every seller mutation is
 * validated against this table on the server.
 */

export interface ListingTransition {
  to: ItemStatus;
  label: string;
  tone: "default" | "danger";
  description: string;
  /** Needs a confirmation dialog before it runs. */
  confirm?: boolean;
}

export const SELLER_TRANSITIONS: Record<ItemStatus, ListingTransition[]> = {
  draft: [
    {
      to: "pending_review",
      label: "Submit for review",
      tone: "default",
      description: "Send this draft to moderation so it can go live.",
    },
  ],
  pending_review: [
    {
      to: "draft",
      label: "Withdraw to draft",
      tone: "default",
      description: "Pull this back from moderation and keep editing it privately.",
    },
  ],
  rejected: [
    {
      to: "pending_review",
      label: "Resubmit for review",
      tone: "default",
      description: "Send the updated listing back to moderation.",
    },
  ],
  published: [
    {
      to: "sold",
      label: "Mark as sold",
      tone: "default",
      description: "Hide it from the marketplace and record it as sold.",
    },
    {
      to: "archived",
      label: "Mark as unavailable",
      tone: "default",
      description: "Temporarily hide it from the marketplace.",
    },
  ],
  sold: [
    {
      to: "published",
      label: "Reactivate",
      tone: "default",
      description: "Return this listing to the marketplace.",
    },
  ],
  archived: [
    {
      to: "published",
      label: "Reactivate",
      tone: "default",
      description: "Return this listing to the marketplace.",
    },
  ],
};

/** Listing statuses a seller may move to from `from`. Empty = no action. */
export function transitionsFrom(from: ItemStatus): ListingTransition[] {
  return SELLER_TRANSITIONS[from] ?? [];
}

export function canTransition(from: ItemStatus, to: ItemStatus): boolean {
  return transitionsFrom(from).some((transition) => transition.to === to);
}

/**
 * Every listing can be deleted from the seller's management menu. The server
 * blocks deletion while an online order or manual sale is still active, so a
 * destructive click can never strand money or an in-flight transaction.
 */
const DELETE_ELIGIBLE: ItemStatus[] = [
  "draft",
  "pending_review",
  "published",
  "rejected",
  "sold",
  "archived",
];

export function canDelete(status: ItemStatus): boolean {
  return DELETE_ELIGIBLE.includes(status);
}

/** Archived listings are reactivated (not edited) to return to the marketplace. */
export function canEdit(status: ItemStatus): boolean {
  return status !== "archived";
}

/**
 * A listing can only be re-published if it has not expired. `expires_at` is not
 * written anywhere yet, so this currently always passes — it is here so the rule
 * holds the moment expiry is introduced.
 */
export function isReactivatable(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return true;
  return new Date(expiresAt).getTime() > Date.now();
}

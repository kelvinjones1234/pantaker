/**
 * Ownership rules for seller-owned records. Kept as pure functions so they can
 * be unit-tested and reused by server actions and the data-access layer without
 * depending on Supabase or Next.js.
 *
 * A record is owned when its `seller_id` matches the authenticated user id.
 * The user id MUST always come from the server session — never from the browser.
 */
export interface OwnedRecord {
  seller_id?: string | null;
}

/** Raised when a caller tries to act on a record they do not own. */
export class OwnershipError extends Error {
  readonly status: 403 | 404;

  constructor(message: string, status: 403 | 404 = 403) {
    super(message);
    this.name = "OwnershipError";
    this.status = status;
  }
}

export function isOwnedBy(
  record: OwnedRecord | null | undefined,
  userId: string | null | undefined,
): boolean {
  if (!record || !userId) return false;
  return typeof record.seller_id === "string" && record.seller_id.length > 0 && record.seller_id === userId;
}

/**
 * Throws unless `record` belongs to `userId`. A missing record is a 404 (the
 * caller cannot even read it, e.g. because RLS returned no row); an existing
 * record owned by someone else is a 403.
 */
export function assertOwnedBy(
  record: OwnedRecord | null | undefined,
  userId: string | null | undefined,
): asserts record is OwnedRecord {
  if (!record) throw new OwnershipError("Listing not found.", 404);
  if (!isOwnedBy(record, userId)) {
    throw new OwnershipError("You do not have access to this listing.", 403);
  }
}

export type InquirySellerResolution =
  | { ok: true; sellerId: string }
  | { ok: false; error: string };

/**
 * Resolve the seller for an inquiry from the listing row itself. The seller id
 * is never accepted from the client, and sellers cannot inquire on their own
 * listing.
 */
export function resolveInquirySeller(
  listing: OwnedRecord | null | undefined,
  buyerId: string | null | undefined,
): InquirySellerResolution {
  if (!listing || typeof listing.seller_id !== "string" || listing.seller_id.length === 0) {
    return { ok: false, error: "That listing is no longer available." };
  }
  if (!buyerId) {
    return { ok: false, error: "Sign in to contact the seller." };
  }
  if (listing.seller_id === buyerId) {
    return { ok: false, error: "You cannot inquire on your own listing." };
  }
  return { ok: true, sellerId: listing.seller_id };
}

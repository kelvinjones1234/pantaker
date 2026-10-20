"use server";

import { revalidatePath } from "next/cache";
import { requireUserForAction } from "@/features/auth/authorization";
import { checkAccountCanWrite } from "@/features/accounts/access";
import {
  assertOwnedBy,
  OwnershipError,
  type OwnedRecord,
} from "@/features/listings/ownership";
import {
  ACTIVE_SALE_STATUSES,
  canOpenSaleForListing,
  canSaleTransition,
  findSaleTransition,
} from "@/features/sales/lifecycle";
import {
  createSaleSchema,
  saleStatusChangeSchema,
  updateSaleDetailsSchema,
} from "@/lib/validation/sales";
import { emitSaleStatusNotification } from "@/features/notifications/emit";
import { getPrisma, isPrismaConfigured } from "@/lib/prisma";
import { withUserContext } from "@/lib/db/context";
import type { SaleStatus } from "@/types/marketplace";

export type SaleActionResult =
  | { ok: true; id?: string; message?: string }
  | {
      ok: false;
      error?: string;
      errors?: Record<string, string[] | undefined>;
    };

function isConfigured() {
  return isPrismaConfigured();
}

const ownershipMessage = (error: unknown, fallback: string) =>
  error instanceof OwnershipError ? error.message : fallback;

/**
 * Record a sale against one of the seller's own listings. The seller id always
 * comes from the session, and the buyer id is derived from the linked enquiry
 * (a trusted server read) — never from the browser. A listing may only have one
 * active sale at a time, which the database enforces independently.
 */
export async function createSaleAction(
  formData: FormData,
): Promise<SaleActionResult> {
  const user = await requireUserForAction("/seller/sales");

  if (!isConfigured()) {
    return {
      ok: false,
      error: "Recording a sale needs database configuration.",
    };
  }

  const access = await checkAccountCanWrite();
  if (!access.ok) return { ok: false, error: access.error };

  const parsed = createSaleSchema.safeParse({
    listing_id: formData.get("listing_id"),
    source_inquiry_id: formData.get("source_inquiry_id") || null,
    buyer_label: formData.get("buyer_label"),
    agreed_price: formData.get("agreed_price"),
    collection_notes: formData.get("collection_notes"),
  });
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }

  const prisma = getPrisma();
  const listing = await prisma.listing.findUnique({
    where: { id: parsed.data.listing_id },
    select: { seller_id: true, item_status: true },
  });

  try {
    assertOwnedBy(listing, user.id);
  } catch (error) {
    return {
      ok: false,
      error: ownershipMessage(
        error,
        "You cannot record a sale for this listing.",
      ),
    };
  }

  if (!canOpenSaleForListing(listing!.item_status)) {
    return {
      ok: false,
      error: "This listing is archived. Restore it before recording a sale.",
    };
  }

  let buyerId: string | null = null;
  if (parsed.data.source_inquiry_id) {
    const enquiry = await prisma.inquiry.findUnique({
      where: { id: parsed.data.source_inquiry_id },
      select: { buyer_id: true, listing_id: true, seller_id: true },
    });
    if (
      !enquiry ||
      enquiry.seller_id !== user.id ||
      enquiry.listing_id !== parsed.data.listing_id
    ) {
      return {
        ok: false,
        error: "That enquiry does not belong to this listing.",
      };
    }
    buyerId = enquiry.buyer_id;
  }

  const active = await prisma.sale.findFirst({
    where: {
      listing_id: parsed.data.listing_id,
      seller_id: user.id,
      status: { in: [...ACTIVE_SALE_STATUSES] },
    },
    select: { id: true },
  });
  if (active) {
    return {
      ok: false,
      error:
        "This listing already has a sale in progress. Finish or cancel it first.",
    };
  }

  let saleId: string;
  try {
    const sale = await withUserContext(user, (tx) =>
      tx.sale.create({
        data: {
          listing_id: parsed.data.listing_id,
          seller_id: user.id,
          buyer_id: buyerId,
          buyer_label: parsed.data.buyer_label ?? null,
          source_inquiry_id: parsed.data.source_inquiry_id,
          agreed_price: parsed.data.agreed_price ?? null,
          collection_notes: parsed.data.collection_notes ?? null,
          status: "awaiting_confirmation",
        },
        select: { id: true },
      }),
    );
    saleId = sale.id;
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return {
        ok: false,
        error:
          "This listing already has a sale in progress. Finish or cancel it first.",
      };
    }
    return { ok: false, error: "Could not record the sale. Please try again." };
  }

  // Tell the buyer (when the sale is tied to a real account) that it exists.
  await emitSaleStatusNotification(user, saleId);

  revalidatePath("/seller/sales");
  return { ok: true, id: saleId };
}

/**
 * Change a sale's status through the lifecycle table. The transition is
 * validated server-side, so a tampered status can never skip a step. Arranging
 * collection additionally requires collection notes to be recorded.
 */
export async function updateSaleStatusAction(
  saleId: string,
  formData: FormData,
): Promise<SaleActionResult> {
  const user = await requireUserForAction(`/seller/sales/${saleId}`);

  if (!isConfigured()) {
    return { ok: false, error: "Status changes need database configuration." };
  }

  const access = await checkAccountCanWrite();
  if (!access.ok) return { ok: false, error: access.error };

  const parsed = saleStatusChangeSchema.safeParse({
    status: formData.get("status"),
    collection_notes: formData.get("collection_notes"),
  });
  if (!parsed.success) {
    return { ok: false, error: "That status change is not allowed." };
  }

  const sale = await getPrisma().sale.findUnique({
    where: { id: saleId },
    select: { seller_id: true, status: true, collection_notes: true },
  });

  try {
    assertOwnedBy(sale, user.id);
  } catch (error) {
    return {
      ok: false,
      error: ownershipMessage(error, "You cannot change this sale."),
    };
  }

  const next = parsed.data.status;
  if (!canSaleTransition(sale!.status as SaleStatus, next)) {
    return { ok: false, error: "That status change is not allowed." };
  }

  const transition = findSaleTransition(sale!.status as SaleStatus, next);
  const notes = parsed.data.collection_notes ?? sale!.collection_notes;
  if (transition?.requiresCollectionNotes && !notes) {
    return {
      ok: false,
      errors: {
        collection_notes: ["Add where and when the buyer will collect."],
      },
    };
  }

  const now = new Date();
  const data: {
    status: string;
    updated_at: Date;
    collection_notes: string | null;
    completed_at?: Date;
    cancelled_at?: Date;
  } = { status: next, updated_at: now, collection_notes: notes };
  if (next === "completed") data.completed_at = now;
  if (next === "cancelled") data.cancelled_at = now;

  const result = await withUserContext(user, (tx) =>
    tx.sale.updateMany({
      where: { id: saleId, seller_id: user.id },
      data,
    }),
  );
  if (result.count === 0) {
    return { ok: false, error: "Could not update the sale. Please try again." };
  }

  // The buyer is told about every status change; the SQL skips sales with no buyer.
  await emitSaleStatusNotification(user, saleId);

  revalidatePath("/seller/sales");
  revalidatePath(`/seller/sales/${saleId}`);
  return { ok: true, message: "Sale updated." };
}

/** Edit the seller-recorded details of a sale (buyer label, price, notes). */
export async function updateSaleDetailsAction(
  saleId: string,
  formData: FormData,
): Promise<SaleActionResult> {
  const user = await requireUserForAction(`/seller/sales/${saleId}`);

  if (!isConfigured()) {
    return { ok: false, error: "Saving details needs database configuration." };
  }

  const access = await checkAccountCanWrite();
  if (!access.ok) return { ok: false, error: access.error };

  const parsed = updateSaleDetailsSchema.safeParse({
    buyer_label: formData.get("buyer_label"),
    agreed_price: formData.get("agreed_price"),
    collection_notes: formData.get("collection_notes"),
  });
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }

  const sale = await getPrisma().sale.findUnique({
    where: { id: saleId },
    select: { seller_id: true },
  });

  try {
    assertOwnedBy(sale as OwnedRecord | null, user.id);
  } catch (error) {
    return {
      ok: false,
      error: ownershipMessage(error, "You cannot edit this sale."),
    };
  }

  const result = await withUserContext(user, (tx) =>
    tx.sale.updateMany({
      where: { id: saleId, seller_id: user.id },
      data: {
        buyer_label: parsed.data.buyer_label ?? null,
        agreed_price: parsed.data.agreed_price ?? null,
        collection_notes: parsed.data.collection_notes ?? null,
        updated_at: new Date(),
      },
    }),
  );
  if (result.count === 0) {
    return { ok: false, error: "Could not save the sale. Please try again." };
  }

  revalidatePath(`/seller/sales/${saleId}`);
  return { ok: true, message: "Sale details saved." };
}

"use server";

import { requireUserForAction } from "@/features/auth/authorization";
import { checkAccountCanWrite } from "@/features/accounts/access";
import {
  createListingSchema,
  inquirySchema,
  listingImageIdsSchema,
  listingIntentSchema,
  reportSchema,
} from "@/lib/validation/listings";
import { uploadLimits } from "@/config/site";
import {
  assertOwnedBy,
  OwnershipError,
  resolveInquirySeller,
  type OwnedRecord,
} from "@/features/listings/ownership";
import {
  canTransition,
  canDelete,
  isReactivatable,
} from "@/features/listings/lifecycle";
import type { ItemStatus } from "@/types/marketplace";
import {
  assertImageObjectsExist,
  deleteStoredImage,
} from "@/lib/image-storage";
import { deleteUnreferencedImages } from "@/lib/image-cleanup";
import { validateListingImageKeys } from "@/features/listings/image-keys";
import { ImageValidationError } from "@/lib/storage/errors";
import { getPrisma, isPrismaConfigured } from "@/lib/prisma";
import { withUserContext, type TransactionClient } from "@/lib/db/context";

function isConfigured() {
  return isPrismaConfigured();
}

const FORM_ERROR = "Could not save listing. Try again.";

/** Create a listing as the authenticated seller. Identity is derived from the session. */
export async function createListingAction(formData: FormData) {
  if (!isConfigured()) {
    return {
      ok: false as const,
      errors: { _form: ["Listing submission needs database configuration."] },
    };
  }
  const user = await requireUserForAction("/sell");
  const access = await checkAccountCanWrite();
  if (!access.ok) {
    return { ok: false as const, errors: { _form: [access.error] } };
  }

  const parsed = createListingSchema.safeParse({
    title: formData.get("title"),
    category_id: formData.get("category_id"),
    description: formData.get("description"),
    condition: formData.get("condition"),
    pricing_type: formData.get("pricing_type"),
    price: formData.get("price") || null,
    negotiable: formData.get("negotiable") === "on",
    quantity: formData.get("quantity") || null,
    quantity_unit: formData.get("quantity_unit") || null,
    city: formData.get("city"),
    area: formData.get("area") || null,
    pickup_notes: formData.get("pickup_notes") || null,
  });

  if (!parsed.success) {
    return { ok: false as const, errors: parsed.error.flatten().fieldErrors };
  }

  // "draft" keeps the listing private; anything else enters moderation.
  const intent = listingIntentSchema
    .catch("publish")
    .parse(formData.get("intent"));

  // Photos are uploaded straight to R2/local storage from the browser;
  // here we only receive the ordered list of image ids (first is the cover).
  let imageIds: string[] = [];
  const rawImageIds = formData.get("image_ids");
  if (typeof rawImageIds === "string" && rawImageIds.trim()) {
    let decoded: unknown;
    try {
      decoded = JSON.parse(rawImageIds);
    } catch {
      return {
        ok: false as const,
        errors: {
          _form: ["We could not read the uploaded photos. Please re-add them."],
        },
      };
    }
    const imagesParsed = listingImageIdsSchema.safeParse(decoded);
    if (!imagesParsed.success) {
      return {
        ok: false as const,
        errors: {
          image_ids: imagesParsed.error.issues.map((issue) => issue.message),
        },
      };
    }
    imageIds = imagesParsed.data;
  }

  const imageCheck = validateListingImageKeys({
    keys: imageIds,
    userId: user.id,
  });
  if (!imageCheck.ok) {
    return {
      ok: false as const,
      errors: { image_ids: [imageCheck.message] },
    };
  }

  try {
    await assertImageObjectsExist(imageCheck.newKeys);
  } catch (error) {
    return {
      ok: false as const,
      errors: {
        image_ids: [
          error instanceof ImageValidationError
            ? error.message
            : "We could not verify the uploaded photos. Please re-add them.",
        ],
      },
    };
  }

  const slugBase = parsed.data.title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);

  let listingId: string;
  try {
    listingId = await withUserContext(user, async (tx) => {
      const listing = await tx.listing.create({
        data: {
          seller_id: user.id,
          slug: `${slugBase}-${Date.now().toString(36)}`,
          item_status: intent === "draft" ? "draft" : "pending_review",
          ...parsed.data,
          price:
            parsed.data.pricing_type === "free"
              ? null
              : (parsed.data.price ?? null),
        },
        select: { id: true },
      });

      if (imageIds.length > 0) {
        await tx.listingImage.createMany({
          data: imageIds.map((storagePath, index) => ({
            listing_id: listing.id,
            storage_path: storagePath,
            sort_order: index,
            alt_text: parsed.data.title,
          })),
        });
      }

      return listing.id;
    });
  } catch {
    await Promise.all(
      imageIds.map((imageId) => deleteStoredImage(imageId)),
    );
    return {
      ok: false as const,
      errors: {
        _form: [
          "We couldn't attach your photos, so nothing was posted. Please try again.",
        ],
      },
    };
  }

  return {
    ok: true as const,
    id: listingId,
    status: intent === "draft" ? "draft" : "pending_review",
  };
}

export async function sendInquiryAction(listingId: string, message: string) {
  const parsed = inquirySchema.safeParse({ listing_id: listingId, message });
  if (!parsed.success)
    return { ok: false as const, error: "Please write a short message." };
  if (!isConfigured()) {
    return {
      ok: false as const,
      error: "Inquiries need database configuration.",
    };
  }

  const user = await requireUserForAction("/marketplace");
  const access = await checkAccountCanWrite();
  if (!access.ok) return { ok: false as const, error: access.error };

  // The seller is resolved from the listing row itself — a seller id supplied by
  // the browser is never trusted.
  const listing = await getPrisma().listing.findUnique({
    where: { id: parsed.data.listing_id },
    select: { seller_id: true },
  });

  const resolution = resolveInquirySeller(
    listing as OwnedRecord | null,
    user.id,
  );
  if (!resolution.ok) return { ok: false as const, error: resolution.error };

  try {
    await withUserContext(user, (tx) =>
      tx.inquiry.create({
        data: {
          listing_id: parsed.data.listing_id,
          buyer_id: user.id,
          seller_id: resolution.sellerId,
          message: parsed.data.message,
        },
      }),
    );
  } catch {
    return {
      ok: false as const,
      error: "Could not send inquiry. The listing may no longer be available.",
    };
  }

  return { ok: true as const };
}

/** Loads a listing's owner id, scoped so callers cannot read another seller's row. */
async function loadListingOwner(
  listingId: string,
): Promise<OwnedRecord | null> {
  return getPrisma().listing.findUnique({
    where: { id: listingId },
    select: { seller_id: true },
  });
}

/**
 * Update a listing the caller owns. Ownership is enforced twice: a server-side
 * check here, and the `seller_id` filter on the write itself.
 */
export async function updateListingAction(
  listingId: string,
  formData: FormData,
) {
  if (!isConfigured()) {
    return {
      ok: false as const,
      errors: { _form: ["Editing needs database configuration."] },
    };
  }

  const user = await requireUserForAction("/seller/listings");
  const access = await checkAccountCanWrite();
  if (!access.ok) {
    return { ok: false as const, errors: { _form: [access.error] } };
  }

  const parsed = createListingSchema.safeParse({
    title: formData.get("title"),
    category_id: formData.get("category_id"),
    description: formData.get("description"),
    condition: formData.get("condition"),
    pricing_type: formData.get("pricing_type"),
    price: formData.get("price") || null,
    negotiable: formData.get("negotiable") === "on",
    quantity: formData.get("quantity") || null,
    quantity_unit: formData.get("quantity_unit") || null,
    city: formData.get("city"),
    area: formData.get("area") || null,
    pickup_notes: formData.get("pickup_notes") || null,
  });
  if (!parsed.success) {
    return { ok: false as const, errors: parsed.error.flatten().fieldErrors };
  }

  const owner = await loadListingOwner(listingId);
  try {
    assertOwnedBy(owner, user.id);
  } catch (error) {
    const message =
      error instanceof OwnershipError
        ? error.message
        : "You cannot edit this listing.";
    return { ok: false as const, errors: { _form: [message] } };
  }

  let currentImagePaths: string[];
  try {
    const rows = await getPrisma().listingImage.findMany({
      where: { listing_id: listingId },
      select: { storage_path: true },
    });
    currentImagePaths = rows.map((row) => row.storage_path);
  } catch {
    return { ok: false as const, errors: { _form: [FORM_ERROR] } };
  }

  // Photos are optional on edit: when present, `image_ids` is the full, ordered
  // set the seller wants to keep (existing ids plus newly uploaded ones).
  const rawEditImageIds = formData.get("image_ids");
  let imageIds: string[] | null = null;
  if (typeof rawEditImageIds === "string" && rawEditImageIds.trim()) {
    let decoded: unknown;
    try {
      decoded = JSON.parse(rawEditImageIds);
    } catch {
      return {
        ok: false as const,
        errors: {
          _form: ["We could not read the photos. Please re-add them."],
        },
      };
    }
    const imagesParsed = listingImageIdsSchema.safeParse(decoded);
    if (!imagesParsed.success) {
      return {
        ok: false as const,
        errors: {
          image_ids: imagesParsed.error.issues.map((issue) => issue.message),
        },
      };
    }
    imageIds = imagesParsed.data;
  }

  let newImageKeys: string[] = [];
  if (imageIds) {
    const imageCheck = validateListingImageKeys({
      keys: imageIds,
      userId: user.id,
      existingKeys: currentImagePaths,
    });
    if (!imageCheck.ok) {
      return {
        ok: false as const,
        errors: { image_ids: [imageCheck.message] },
      };
    }
    newImageKeys = imageCheck.newKeys;

    try {
      await assertImageObjectsExist(newImageKeys);
    } catch (error) {
      return {
        ok: false as const,
        errors: {
          image_ids: [
            error instanceof ImageValidationError
              ? error.message
              : "We could not verify the uploaded photos. Please re-add them.",
          ],
        },
      };
    }
  }

  const stalePaths = await withUserContext(user, async (tx) => {
    const result = await tx.listing.updateMany({
      where: { id: listingId, seller_id: user.id },
      data: {
        ...parsed.data,
        price:
          parsed.data.pricing_type === "free"
            ? null
            : (parsed.data.price ?? null),
      },
    });
    if (result.count === 0) throw new Error("listing_not_owned");

    if (!imageIds) return [];
    return reconcileListingImages(tx, listingId, imageIds, parsed.data.title);
  }).catch(() => null);

  if (stalePaths === null) {
    await Promise.all(newImageKeys.map((key) => deleteStoredImage(key)));
    return { ok: false as const, errors: { _form: [FORM_ERROR] } };
  }

  if (stalePaths.length > 0) await deleteUnreferencedImages(stalePaths);

  return { ok: true as const, id: listingId };
}

/**
 * Sync a listing's image rows to the ordered list the seller wants. Returns the
 * paths removed from the database; their assets are deleted by the caller only
 * after the transaction commits and no other row references them.
 */
async function reconcileListingImages(
  tx: TransactionClient,
  listingId: string,
  desired: string[],
  altText: string,
): Promise<string[]> {
  const current = await tx.listingImage.findMany({
    where: { listing_id: listingId },
    select: { id: true, storage_path: true },
  });

  const desiredSet = new Set(desired);
  const staleRows = current.filter((row) => !desiredSet.has(row.storage_path));
  if (staleRows.length > 0) {
    await tx.listingImage.deleteMany({
      where: { id: { in: staleRows.map((row) => row.id) } },
    });
  }

  const byPath = new Map(current.map((row) => [row.storage_path, row]));
  for (let index = 0; index < desired.length; index += 1) {
    const storagePath = desired[index];
    const existing = byPath.get(storagePath);
    if (existing) {
      await tx.listingImage.update({
        where: { id: existing.id },
        data: { sort_order: index },
      });
    } else {
      await tx.listingImage.create({
        data: {
          listing_id: listingId,
          storage_path: storagePath,
          sort_order: index,
          alt_text: altText,
        },
      });
    }
  }

  return staleRows.map((row) => row.storage_path);
}

/**
 * Change a listing's status, enforcing the seller lifecycle table. Moderation
 * transitions are deliberately not reachable here. Ownership is checked against
 * the session, and the write is additionally filtered by `seller_id`.
 */
export async function updateListingStatusAction(
  listingId: string,
  nextStatus: string,
) {
  if (!isConfigured()) {
    return {
      ok: false as const,
      error: "Status changes need database configuration.",
    };
  }

  const user = await requireUserForAction("/seller/listings");
  const access = await checkAccountCanWrite();
  if (!access.ok) return { ok: false as const, error: access.error };

  const record = await getPrisma().listing.findUnique({
    where: { id: listingId },
    select: { seller_id: true, item_status: true, expires_at: true },
  });

  try {
    assertOwnedBy(record, user.id);
  } catch {
    return { ok: false as const, error: "You cannot change this listing." };
  }

  const current = record!.item_status as ItemStatus;
  const next = nextStatus as ItemStatus;
  if (!canTransition(current, next)) {
    return { ok: false as const, error: "That status change is not allowed." };
  }
  if (
    next === "published" &&
    !isReactivatable(record!.expires_at?.toISOString() ?? null)
  ) {
    return {
      ok: false as const,
      error: "This listing has expired. Edit and resubmit it instead.",
    };
  }

  try {
    const result = await withUserContext(user, (tx) =>
      tx.listing.updateMany({
        where: { id: listingId, seller_id: user.id },
        data: { item_status: next, updated_at: new Date() },
      }),
    );
    if (result.count === 0) {
      return {
        ok: false as const,
        error: "Could not update the status. Try again.",
      };
    }
  } catch {
    return {
      ok: false as const,
      error: "Could not update the status. Try again.",
    };
  }

  return { ok: true as const, status: next };
}

/** Delete a listing the caller owns. Never trusts a client-supplied owner id. */
export async function deleteListingAction(listingId: string) {
  if (!isConfigured()) {
    return {
      ok: false as const,
      error: "Deleting needs database configuration.",
    };
  }

  const user = await requireUserForAction("/seller/listings");
  const access = await checkAccountCanWrite();
  if (!access.ok) return { ok: false as const, error: access.error };

  const record = await getPrisma().listing.findUnique({
    where: { id: listingId },
    select: {
      seller_id: true,
      item_status: true,
      images: { select: { storage_path: true } },
    },
  });

  try {
    assertOwnedBy(record, user.id);
  } catch (error) {
    const message =
      error instanceof OwnershipError
        ? error.message
        : "You cannot delete this listing.";
    return { ok: false as const, error: message };
  }

  if (!canDelete(record!.item_status as ItemStatus)) {
    return {
      ok: false as const,
      error: "Archive this listing before deleting it.",
    };
  }

  const imagePaths = record!.images
    .map((image) => image.storage_path)
    .filter(
      (path): path is string => typeof path === "string" && path.length > 0,
    );

  try {
    const result = await withUserContext(user, (tx) =>
      tx.listing.deleteMany({
        where: { id: listingId, seller_id: user.id },
      }),
    );
    if (result.count === 0) {
      return {
        ok: false as const,
        error: "Could not delete the listing. Try again.",
      };
    }
  } catch {
    return {
      ok: false as const,
      error: "Could not delete the listing. Try again.",
    };
  }

  await deleteUnreferencedImages(imagePaths);
  return { ok: true as const };
}

export async function reportListingAction(
  listingId: string,
  reason: string,
  details: string,
) {
  const parsed = reportSchema.safeParse({
    listing_id: listingId,
    reason,
    details,
  });
  if (!parsed.success)
    return { ok: false as const, error: "Please complete the report form." };
  if (!isConfigured()) {
    return {
      ok: false as const,
      error: "Reports need database configuration.",
    };
  }

  const user = await requireUserForAction("/marketplace");

  try {
    await getPrisma().report.create({
      data: {
        reporter_id: user.id,
        listing_id: listingId,
        reason: parsed.data.reason,
        details: parsed.data.details,
      },
    });
  } catch {
    return { ok: false as const, error: "Could not submit report. Try again." };
  }

  return { ok: true as const };
}

export { uploadLimits };

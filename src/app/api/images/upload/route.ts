import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { uploadLimits } from "@/config/site";
import { checkAccountCanWrite } from "@/features/accounts/access";
import { getAuthUser } from "@/features/auth/queries";
import { isSameOriginRequest } from "@/lib/http/same-origin";
import {
  assertImageObjectsExist,
  deleteStoredImage,
  isImageStorageConfigured,
  storeImageObject,
} from "@/lib/image-storage";
import { isLocalImageMode } from "@/lib/local/flags";
import { newLocalImageId, saveLocalImageBytes } from "@/lib/local/images";
import { getPrisma } from "@/lib/prisma";
import {
  ImageValidationError,
  ObjectKeyError,
  StorageConfigError,
  StorageOperationError,
  safeErrorMessage,
} from "@/lib/storage/errors";
import {
  processUploadedImage,
  validateDeclaredImageType,
  type UploadPurpose,
} from "@/lib/storage/image-processing";
import {
  listingImageKey,
  profileImageKey,
  isUuid,
} from "@/lib/storage/object-keys";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UPLOADS_PER_HOUR = 30;
const MULTIPART_OVERHEAD_BYTES = 1024 * 1024;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function isFileEntry(value: FormDataEntryValue | null): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    "arrayBuffer" in value &&
    "size" in value &&
    "type" in value
  );
}

function parsePurpose(value: FormDataEntryValue | null): UploadPurpose | null {
  return value === "listing" || value === "profile" ? value : null;
}

function safeUploadMessage(error: unknown): string {
  return safeErrorMessage(error, "Could not upload this photo. Please try again.");
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return jsonError("That request was not allowed.", 403);
  }

  if (!isImageStorageConfigured()) {
    return jsonError("Image uploads are not configured yet.", 501);
  }

  const user = await getAuthUser();
  if (!user) {
    return jsonError("Sign in to upload photos.", 401);
  }

  const access = await checkAccountCanWrite();
  if (!access.ok) {
    return jsonError(access.error, 403);
  }

  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (
    Number.isFinite(declaredLength) &&
    declaredLength > uploadLimits.maxBytes + MULTIPART_OVERHEAD_BYTES
  ) {
    return jsonError(
      `Each photo must be under ${Math.round(uploadLimits.maxBytes / (1024 * 1024))}MB.`,
      413,
    );
  }

  const prisma = getPrisma();
  const since = new Date(Date.now() - 60 * 60 * 1000);
  let uploadCount: number;
  try {
    uploadCount = await prisma.uploadRequest.count({
      where: { user_id: user.id, created_at: { gte: since } },
    });
  } catch {
    return jsonError("Upload limits are unavailable. Try again shortly.", 503);
  }
  if (uploadCount >= UPLOADS_PER_HOUR) {
    return jsonError(
      "You have reached the hourly upload limit. Try again later.",
      429,
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError("Could not read the upload.", 400);
  }

  const purpose = parsePurpose(form.get("purpose"));
  if (!purpose) {
    return jsonError("Choose a valid photo purpose.", 400);
  }

  const listingIdRaw = form.get("listingId");
  const listingId =
    typeof listingIdRaw === "string" && listingIdRaw.trim()
      ? listingIdRaw.trim()
      : null;

  if (purpose === "listing" && listingId) {
    if (!isUuid(listingId)) {
      return jsonError("That listing is invalid.", 400);
    }
    const listing = await prisma.listing
      .findUnique({ where: { id: listingId }, select: { seller_id: true } })
      .catch(() => null);
    if (!listing) {
      return jsonError("That listing was not found.", 404);
    }
    if (listing.seller_id !== user.id) {
      return jsonError("You cannot add photos to this listing.", 403);
    }
  }

  const file = form.get("file");
  if (!isFileEntry(file)) {
    return jsonError("Choose a photo to upload.", 400);
  }
  if (file.size === 0) {
    return jsonError("The selected file is empty.", 400);
  }
  if (file.size > uploadLimits.maxBytes) {
    return jsonError(
      `Each photo must be under ${Math.round(uploadLimits.maxBytes / (1024 * 1024))}MB.`,
      413,
    );
  }

  const typeError = validateDeclaredImageType(file.type || "");
  if (typeError) return jsonError(typeError, 400);

  let input: Buffer;
  try {
    input = Buffer.from(await file.arrayBuffer());
  } catch {
    return jsonError("Could not read the upload.", 400);
  }

  let key: string;
  let processed: Awaited<ReturnType<typeof processUploadedImage>>;
  try {
    processed = await processUploadedImage(input, { purpose });
    key =
      purpose === "profile"
        ? profileImageKey(user.id, randomUUID())
        : listingImageKey(user.id, randomUUID());
  } catch (error) {
    const status = error instanceof ImageValidationError ? error.status : 400;
    return jsonError(safeUploadMessage(error), status);
  }

  try {
    await prisma.uploadRequest.create({ data: { user_id: user.id } });
  } catch {
    return jsonError("Could not record this upload. Try again shortly.", 503);
  }

  try {
    if (isLocalImageMode()) {
      const localId = newLocalImageId();
      await saveLocalImageBytes(localId, user.id, processed.bytes, {
        mime: processed.contentType,
        name: file.name || "image.webp",
      });
      return NextResponse.json({ key: localId }, { status: 201 });
    }

    await storeImageObject({
      key,
      bytes: processed.bytes,
      contentType: processed.contentType,
    });
    await assertImageObjectsExist([key]);

    return NextResponse.json({ key }, { status: 201 });
  } catch (error) {
    console.error("[images/upload] storage failure", {
      userId: user.id,
      purpose,
      error:
        error instanceof StorageConfigError ||
        error instanceof StorageOperationError ||
        error instanceof ObjectKeyError ||
        error instanceof ImageValidationError
          ? error.name
          : "UnknownError",
      status:
        typeof error === "object" &&
        error &&
        "$metadata" in error &&
        (error as { $metadata?: { httpStatusCode?: number } }).$metadata
          ?.httpStatusCode,
    });

    if (isSafeUploadKeySafeToDelete(key)) {
      await deleteStoredImage(key);
    }

    const status =
      error instanceof ImageValidationError
        ? error.status
        : error instanceof StorageConfigError
          ? 501
          : 502;
    return jsonError(safeUploadMessage(error), status);
  }
}

function isSafeUploadKeySafeToDelete(key: string): boolean {
  return key.startsWith("listings/") || key.startsWith("profiles/");
}

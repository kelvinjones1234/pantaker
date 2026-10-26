import {
  deleteLocalImage,
  isLocalImageId,
  localImageExists,
  localImageUrl,
} from "@/lib/local/images";
import { isLocalImageMode } from "@/lib/local/flags";
import {
  buildPublicObjectUrl,
  isLegacyImageId,
  isPrivateObjectKey,
  isSafeObjectKey,
  trustedLegacyImageUrl,
} from "@/lib/storage/object-keys";
import {
  deleteObject,
  getPublicBaseUrl,
  headObject,
  isR2Configured,
  putObject,
} from "@/lib/storage/cloudflare-r2";
import { ImageValidationError } from "@/lib/storage/errors";

/**
 * Central image storage facade. Object keys are the canonical reference stored
 * in Postgres; public delivery URLs are generated at read time.
 */
export function isImageStorageConfigured(): boolean {
  if (isLocalImageMode()) return true;
  return isR2Configured();
}

function legacyCloudflareImageUrl(key: string): string | null {
  if (!isLegacyImageId(key)) return null;
  const hash = process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_DELIVERY_HASH?.trim();
  if (!hash) return null;
  return `https://imagedelivery.net/${encodeURIComponent(hash)}/${encodeURIComponent(
    key,
  )}/public`;
}

function allowedLegacyHosts(): string[] {
  const hosts = new Set(["imagedelivery.net", "images.unsplash.com"]);
  try {
    const base = new URL(getPublicBaseUrl());
    hosts.add(base.hostname.toLowerCase());
  } catch {
    // The public domain may be unset while rendering legacy test data.
  }
  return [...hosts];
}

export function deliveryUrl(key: string): string {
  if (!key) throw new Error("An image key is required.");

  if (isLocalImageId(key)) {
    if (!isLocalImageMode()) {
      throw new Error(
        "This image only exists in local development storage. Re-upload it.",
      );
    }
    return localImageUrl(key);
  }

  if (key.startsWith("data:image/")) {
    if (key.length > 6_000_000) {
      throw new Error("That embedded image is too large to render.");
    }
    return key;
  }

  if (/^https?:\/\//i.test(key)) {
    const trusted = trustedLegacyImageUrl(key, allowedLegacyHosts());
    if (!trusted) {
      throw new Error("That legacy image URL is not trusted.");
    }
    return trusted;
  }

  if (isSafeObjectKey(key)) {
    if (isPrivateObjectKey(key)) {
      throw new Error("Private documents are not publicly accessible.");
    }
    return buildPublicObjectUrl(key, getPublicBaseUrl());
  }

  const legacy = legacyCloudflareImageUrl(key);
  if (legacy) return legacy;

  throw new Error("That image reference is invalid.");
}

export async function storeImageObject(input: {
  key: string;
  bytes: Buffer;
  contentType: string;
}): Promise<void> {
  await putObject({
    key: input.key,
    body: input.bytes,
    contentType: input.contentType,
    cacheControl: "public, max-age=31536000, immutable",
  });
}

export async function imageObjectExists(key: string): Promise<boolean> {
  if (isLocalImageMode() && isLocalImageId(key)) {
    return localImageExists(key);
  }
  if (!isSafeObjectKey(key) || isPrivateObjectKey(key)) return false;
  return (await headObject(key)) !== null;
}

export async function assertImageObjectsExist(keys: string[]): Promise<void> {
  for (const key of keys) {
    if (!(await imageObjectExists(key))) {
      throw new ImageValidationError(
        "One of the photos was not uploaded successfully. Please re-add it.",
      );
    }
  }
}

/**
 * Delete an object from R2 or local development storage. Returns true when the
 * request succeeded (or the object no longer exists), false when storage is not
 * configured or the request failed. Callers treat this as best-effort cleanup.
 */
export async function deleteStoredImage(key: string): Promise<boolean> {
  if (isLocalImageMode() && isLocalImageId(key)) {
    return deleteLocalImage(key);
  }
  if (!isSafeObjectKey(key)) return false;

  try {
    await deleteObject(key);
    return true;
  } catch {
    return false;
  }
}

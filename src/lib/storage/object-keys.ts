import { ObjectKeyError } from "@/lib/storage/errors";

export const OBJECT_KEY_MAX_LENGTH = 512;
export const PRIVATE_OBJECT_PREFIX = "private/";
export const LEGACY_OBJECT_PREFIX = "media/";
export const MIGRATED_OBJECT_PREFIX = "migrated/";

const PUBLIC_OBJECT_PREFIXES = [
  "listings/",
  "profiles/",
  "categories/",
  "admin/",
  LEGACY_OBJECT_PREFIX,
  MIGRATED_OBJECT_PREFIX,
] as const;

const SEGMENT_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LEGACY_IMAGE_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const LOCAL_IMAGE_ID_PATTERN =
  /^local-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export type PublicObjectPrefix = (typeof PUBLIC_OBJECT_PREFIXES)[number];

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export function isLocalImageId(value: string): boolean {
  return LOCAL_IMAGE_ID_PATTERN.test(value);
}

export function isLegacyImageId(value: string): boolean {
  return LEGACY_IMAGE_ID_PATTERN.test(value);
}

export function isPrivateObjectKey(key: string): boolean {
  return key.startsWith(PRIVATE_OBJECT_PREFIX);
}

export function isPublicObjectKey(key: string): boolean {
  return (
    PUBLIC_OBJECT_PREFIXES.some((prefix) => key.startsWith(prefix)) &&
    !isPrivateObjectKey(key)
  );
}

export function isSafeObjectKey(key: string): boolean {
  if (typeof key !== "string") return false;
  if (key.length === 0 || key.length > OBJECT_KEY_MAX_LENGTH) return false;
  if (!key.includes("/")) return false;
  if (key.startsWith("/") || key.endsWith("/")) return false;
  if (key.includes("\\") || key.includes("//")) return false;
  if (key.includes("%")) return false;

  return key.split("/").every(
    (segment) =>
      segment.length > 0 &&
      segment !== "." &&
      segment !== ".." &&
      SEGMENT_PATTERN.test(segment),
  );
}

export function assertSafeObjectKey(key: string): string {
  if (!isSafeObjectKey(key)) throw new ObjectKeyError();
  return key;
}

export function isListingImageKeyForUser(key: string, userId: string): boolean {
  return (
    isSafeObjectKey(key) &&
    isUuid(userId) &&
    key.startsWith(`listings/${userId}/`) &&
    key.endsWith(".webp")
  );
}

export function isProfileImageKeyForUser(key: string, userId: string): boolean {
  return (
    isSafeObjectKey(key) &&
    isUuid(userId) &&
    key.startsWith(`profiles/${userId}/`) &&
    key.endsWith(".webp")
  );
}

export function isCategoryImageKeyForUser(
  key: string,
  categoryId: string,
): boolean {
  return (
    isSafeObjectKey(key) &&
    isUuid(categoryId) &&
    key.startsWith(`categories/${categoryId}/`) &&
    key.endsWith(".webp")
  );
}

export function isPrivateObjectKeyForResource(
  key: string,
  resourceType: string,
  resourceId: string,
): boolean {
  return (
    isSafeObjectKey(key) &&
    key.startsWith(`private/${resourceType}/${resourceId}/`)
  );
}

export function listingImageKey(userId: string, id: string): string {
  if (!isUuid(userId) || !isUuid(id)) throw new ObjectKeyError();
  return `listings/${userId}/${id}.webp`;
}

export function profileImageKey(userId: string, id: string): string {
  if (!isUuid(userId) || !isUuid(id)) throw new ObjectKeyError();
  return `profiles/${userId}/${id}.webp`;
}

export function categoryImageKey(categoryId: string, id: string): string {
  if (!isUuid(categoryId) || !isUuid(id)) throw new ObjectKeyError();
  return `categories/${categoryId}/${id}.webp`;
}

export function migratedListingImageKey(
  listingId: string,
  digest: string,
): string {
  if (!isUuid(listingId) || !/^[a-f0-9]{64}$/i.test(digest)) {
    throw new ObjectKeyError();
  }
  return `${MIGRATED_OBJECT_PREFIX}listings/${listingId}/${digest.toLowerCase()}.webp`;
}

export function migratedProfileImageKey(
  userId: string,
  digest: string,
): string {
  if (!isUuid(userId) || !/^[a-f0-9]{64}$/i.test(digest)) {
    throw new ObjectKeyError();
  }
  return `${MIGRATED_OBJECT_PREFIX}profiles/${userId}/${digest.toLowerCase()}.webp`;
}

export function normalizePublicBaseUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new ObjectKeyError("NEXT_PUBLIC_R2_PUBLIC_DOMAIN is not set.");
  }

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(withProtocol);
  } catch {
    throw new ObjectKeyError(
      "NEXT_PUBLIC_R2_PUBLIC_DOMAIN is not a valid URL.",
    );
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new ObjectKeyError(
      "NEXT_PUBLIC_R2_PUBLIC_DOMAIN must use http or https.",
    );
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new ObjectKeyError(
      "NEXT_PUBLIC_R2_PUBLIC_DOMAIN must be a plain public URL.",
    );
  }
  if (url.pathname.replace(/\/+$/, "") !== "") {
    throw new ObjectKeyError(
      "NEXT_PUBLIC_R2_PUBLIC_DOMAIN must not include a path.",
    );
  }

  return `${url.protocol}//${url.host}`.replace(/\/+$/, "");
}

export function encodeObjectKey(key: string): string {
  assertSafeObjectKey(key);
  return key.split("/").map((segment) => encodeURIComponent(segment)).join("/");
}

export function buildPublicObjectUrl(
  key: string,
  publicBaseUrl: string,
  options: { allowPrivate?: boolean } = {},
): string {
  assertSafeObjectKey(key);
  if (isPrivateObjectKey(key) && !options.allowPrivate) {
    throw new ObjectKeyError("Private documents are not publicly accessible.");
  }

  let base: string;
  try {
    base = normalizePublicBaseUrl(publicBaseUrl);
  } catch (error) {
    throw new ObjectKeyError(
      error instanceof Error
        ? error.message
        : "The public image domain is misconfigured.",
    );
  }

  return `${base}/${encodeObjectKey(key)}`;
}

export function trustedLegacyImageUrl(
  value: string,
  allowedHosts: readonly string[],
): string | null {
  if (!/^https?:\/\//i.test(value)) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.username || url.password) return null;
    if (!allowedHosts.includes(url.hostname.toLowerCase())) return null;
    return url.toString();
  } catch {
    return null;
  }
}

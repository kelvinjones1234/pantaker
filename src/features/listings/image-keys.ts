import { uploadLimits } from "@/config/site";
import {
  isListingImageKeyForUser,
  isProfileImageKeyForUser,
  isPrivateObjectKey,
  isSafeObjectKey,
} from "@/lib/storage/object-keys";

export type ImageKeyCheck =
  | { ok: true; keys: string[]; newKeys: string[] }
  | { ok: false; message: string };

const INVALID = "One of the uploaded photos is invalid.";

/**
 * New listing images must live under the seller's own R2 prefix. Keys already
 * attached to the listing are allowed so legacy/migrated records survive edits.
 */
export function validateListingImageKeys(input: {
  keys: string[];
  userId: string;
  existingKeys?: string[];
}): ImageKeyCheck {
  const { keys, userId } = input;
  const existing = new Set(input.existingKeys ?? []);

  if (keys.length > uploadLimits.maxImages) {
    return {
      ok: false,
      message: `You can add up to ${uploadLimits.maxImages} photos.`,
    };
  }
  if (new Set(keys).size !== keys.length) {
    return { ok: false, message: "Each photo can only be added once." };
  }

  const newKeys: string[] = [];
  for (const key of keys) {
    if (existing.has(key)) continue;
    if (
      !isSafeObjectKey(key) ||
      isPrivateObjectKey(key) ||
      !isListingImageKeyForUser(key, userId)
    ) {
      return { ok: false, message: INVALID };
    }
    newKeys.push(key);
  }

  return { ok: true, keys, newKeys };
}

export type ProfileImageKeyCheck =
  | { ok: true; key: string | null; newKey: string | null }
  | { ok: false; message: string };

export function validateProfileImageKey(input: {
  key: string | null | undefined;
  userId: string;
  currentKey?: string | null;
}): ProfileImageKeyCheck {
  const key = input.key?.trim() || null;
  if (!key) return { ok: true, key: null, newKey: null };

  if (input.currentKey && key === input.currentKey) {
    return { ok: true, key, newKey: null };
  }
  if (
    !isSafeObjectKey(key) ||
    isPrivateObjectKey(key) ||
    !isProfileImageKeyForUser(key, input.userId)
  ) {
    return { ok: false, message: "That profile photo is invalid." };
  }

  return { ok: true, key, newKey: key };
}

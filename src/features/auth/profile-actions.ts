"use server";

import { requireUserForAction } from "@/features/auth/authorization";
import { checkAccountCanWrite } from "@/features/accounts/access";
import { getPrisma, isPrismaConfigured } from "@/lib/prisma";
import { profileSchema, storedImageIdSchema } from "@/lib/validation/listings";
import { validateProfileImageKey } from "@/features/listings/image-keys";
import {
  assertImageObjectsExist,
  deleteStoredImage,
} from "@/lib/image-storage";
import { deleteUnreferencedImages } from "@/lib/image-cleanup";
import { ImageValidationError } from "@/lib/storage/errors";

export type UpdateProfileResult =
  | { ok: true }
  | {
      ok: false;
      errors?: Record<string, string[] | undefined>;
      error?: string;
    };

/**
 * Update the signed-in user's own profile. The row id is always the session user
 * id — a client cannot target another profile, because no id is ever read from
 * the request. Credentials/identity are owned by public.users, not written here,
 * and no contact details are collected, so nothing private can be exposed.
 */
export async function updateProfileAction(
  formData: FormData,
): Promise<UpdateProfileResult> {
  const user = await requireUserForAction("/seller/profile");
  const access = await checkAccountCanWrite();
  if (!access.ok) {
    return { ok: false, error: access.error };
  }

  const parsed = profileSchema.safeParse({
    display_name: formData.get("display_name"),
    username: formData.get("username") ?? undefined,
    account_type: formData.get("account_type") || "individual",
    city: formData.get("city") || null,
    area: formData.get("area") || null,
    bio: formData.get("bio") || null,
  });
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }

  if (!isPrismaConfigured()) {
    return {
      ok: false,
      error: "Profile editing needs database configuration.",
    };
  }

  const prisma = getPrisma();
  const { username, ...rest } = parsed.data;

  let currentAvatar: string | null = null;
  try {
    const current = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { avatar_path: true },
    });
    currentAvatar = current?.avatar_path ?? null;
  } catch {
    return { ok: false, error: "Could not load your profile. Please try again." };
  }

  // Optional avatar (R2 object key). Never a URL — just the key we stored.
  const rawAvatar = formData.get("avatar_path");
  let avatarPath: string | null = null;
  let newAvatarKey: string | null = null;
  if (typeof rawAvatar === "string" && rawAvatar.trim()) {
    const avatarParsed = storedImageIdSchema.safeParse(rawAvatar.trim());
    if (!avatarParsed.success) {
      return {
        ok: false,
        errors: { avatar_path: ["That profile photo is invalid."] },
      };
    }

    const avatarCheck = validateProfileImageKey({
      key: avatarParsed.data,
      userId: user.id,
      currentKey: currentAvatar,
    });
    if (!avatarCheck.ok) {
      return { ok: false, errors: { avatar_path: [avatarCheck.message] } };
    }
    avatarPath = avatarCheck.key;
    newAvatarKey = avatarCheck.newKey;
  }

  if (newAvatarKey) {
    try {
      await assertImageObjectsExist([newAvatarKey]);
    } catch (error) {
      if (error instanceof ImageValidationError) {
        return { ok: false, errors: { avatar_path: [error.message] } };
      }
      return {
        ok: false,
        error: "Could not verify that profile photo. Please re-add it.",
      };
    }
  }

  if (username) {
    const existing = await prisma.profile.findFirst({ where: { username } });
    if (existing && existing.id !== user.id) {
      return {
        ok: false,
        errors: { username: ["That username is already taken."] },
      };
    }
  }

  try {
    await prisma.profile.upsert({
      where: { id: user.id },
      create: {
        id: user.id,
        username,
        avatar_path: avatarPath,
        ...rest,
      },
      update: { username, avatar_path: avatarPath, ...rest },
    });
  } catch (error) {
    if (newAvatarKey) await deleteStoredImage(newAvatarKey);

    // Unique constraint race on username — surface it as a field error.
    if (
      typeof error === "object" &&
      error &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return {
        ok: false,
        errors: { username: ["That username is already taken."] },
      };
    }
    return {
      ok: false,
      error: "Could not save your profile. Please try again.",
    };
  }

  if (currentAvatar && currentAvatar !== avatarPath) {
    await deleteUnreferencedImages([currentAvatar]);
  }

  return { ok: true };
}

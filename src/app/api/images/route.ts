import { NextResponse } from "next/server";
import { checkAccountCanWrite } from "@/features/accounts/access";
import { getAuthUser } from "@/features/auth/queries";
import { countImageReferences } from "@/lib/image-cleanup";
import { deleteStoredImage } from "@/lib/image-storage";
import { isSameOriginRequest } from "@/lib/http/same-origin";
import { isLocalImageMode } from "@/lib/local/flags";
import { isPrismaConfigured } from "@/lib/prisma";
import {
  isLocalImageId,
  isListingImageKeyForUser,
  isPrivateObjectKey,
  isProfileImageKeyForUser,
  isSafeObjectKey,
} from "@/lib/storage/object-keys";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function DELETE(request: Request) {
  if (!isSameOriginRequest(request)) {
    return jsonError("That request was not allowed.", 403);
  }

  const user = await getAuthUser();
  if (!user) {
    return jsonError("Sign in to manage photos.", 401);
  }

  const access = await checkAccountCanWrite();
  if (!access.ok) {
    return jsonError(access.error, 403);
  }

  let key = "";
  try {
    const body = (await request.json()) as { key?: unknown };
    if (typeof body?.key === "string") key = body.key.trim();
  } catch {
    return jsonError("Could not read that photo.", 400);
  }

  if (!key) return jsonError("A photo key is required.", 400);

  const localKey = isLocalImageMode() && isLocalImageId(key);
  if (!localKey) {
    if (!isSafeObjectKey(key) || isPrivateObjectKey(key)) {
      return jsonError("That photo reference is invalid.", 400);
    }
    if (
      !isListingImageKeyForUser(key, user.id) &&
      !isProfileImageKeyForUser(key, user.id)
    ) {
      return jsonError("You cannot delete that photo.", 403);
    }
  }

  if (!isPrismaConfigured()) {
    return jsonError("Photo deletion needs database configuration.", 503);
  }

  let references: number;
  try {
    references = await countImageReferences(key);
  } catch {
    return jsonError("Could not verify that photo. Try again shortly.", 503);
  }
  if (references > 0) {
    return jsonError(
      "That photo is still attached to your account. Save the change first.",
      409,
    );
  }

  const deleted = await deleteStoredImage(key);
  if (!deleted) {
    return jsonError("Could not delete that photo. Try again.", 502);
  }

  return NextResponse.json({ ok: true });
}

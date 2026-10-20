"use server";

import { revalidatePath } from "next/cache";
import { requireAdminPermissionForAction } from "@/features/admin/authorization";
import { deleteAccountCompletely } from "@/features/accounts/deletion";
import { getPrisma, isPrismaConfigured } from "@/lib/prisma";
import { withServiceContext } from "@/lib/db/context";

export type DeletionActionResult =
  { ok: true; message?: string } | { ok: false; error?: string };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function processDeletionRequestAction(
  formData: FormData,
): Promise<DeletionActionResult> {
  const actor = await requireAdminPermissionForAction("users.manage");
  const userId = String(formData.get("user_id") ?? "").trim();
  if (!UUID_PATTERN.test(userId)) {
    return { ok: false, error: "That account could not be identified." };
  }
  if (!isPrismaConfigured()) {
    return {
      ok: false,
      error: "Deleting accounts needs database configuration.",
    };
  }

  const result = await deleteAccountCompletely(userId, actor.id);
  if (!result.ok) return { ok: false, error: result.error };

  try {
    await withServiceContext(actor.id, (tx) =>
      tx.adminAuditEvent.create({
        data: {
          actor_id: actor.id,
          action: "account.deletion_processed",
          target_type: "user",
          target_id: userId,
        },
      }),
    );
  } catch {
    // The delete RPC already records account.deleted; this is an extra marker.
  }

  revalidatePath("/admin");
  revalidatePath("/admin/deletion-requests");
  return { ok: true, message: "Account deleted." };
}

export async function dismissDeletionRequestAction(
  formData: FormData,
): Promise<DeletionActionResult> {
  await requireAdminPermissionForAction("users.manage");
  const userId = String(formData.get("user_id") ?? "").trim();
  if (!UUID_PATTERN.test(userId)) {
    return { ok: false, error: "That account could not be identified." };
  }
  if (!isPrismaConfigured()) {
    return {
      ok: false,
      error: "Dismissing a request needs database configuration.",
    };
  }

  try {
    await getPrisma().profile.update({
      where: { id: userId },
      data: { deletion_requested_at: null },
    });
  } catch {
    return {
      ok: false,
      error: "Could not dismiss this request. Please try again.",
    };
  }

  revalidatePath("/admin/deletion-requests");
  return { ok: true, message: "Deletion request dismissed." };
}

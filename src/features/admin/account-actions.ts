"use server";

import { revalidatePath } from "next/cache";
import { requireAdminPermissionForAction } from "@/features/admin/authorization";
import {
  evaluateAccountStatusChange,
  type AccountDisplayStatus,
} from "@/features/admin/account-rules";
import {
  AccountStorageError,
  readAccountDirectory,
  setAccountStatusRpc,
} from "@/features/admin/account-queries";
import { accountStatusSchema } from "@/lib/validation/accounts";
import { isPrismaConfigured } from "@/lib/prisma";

export type AccountActionResult =
  | { ok: true; message?: string }
  | {
      ok: false;
      error?: string;
      errors?: Record<string, string[] | undefined>;
    };

const SERVICE_ROLE_ERROR =
  "Managing account access needs database configuration.";

function revalidateAccountSurfaces() {
  revalidatePath("/admin");
  revalidatePath("/admin/accounts");
}

function storageError(error: unknown): string {
  if (error instanceof AccountStorageError) {
    if (error.message.includes("last_super_admin")) {
      return "Pantaker needs at least one super admin. Promote another account first.";
    }
    if (error.message.includes("self_restriction")) {
      return "You cannot change your own account status.";
    }
    if (error.message.includes("account_not_found")) {
      return "That account no longer exists. Refresh and try again.";
    }
    if (error.message.includes("invalid_reason")) {
      return "Give a reason of 5–500 characters for the audit trail.";
    }
    if (error.message.includes("forbidden")) {
      return "You do not have permission to change account access.";
    }
  }
  return "Could not update this account. Please try again.";
}

function successMessage(status: AccountDisplayStatus): string {
  if (status === "active") return "Account restored.";
  if (status === "suspended") return "Account suspended.";
  return "Account restricted.";
}

export async function setAccountStatusAction(
  formData: FormData,
): Promise<AccountActionResult> {
  const actor = await requireAdminPermissionForAction("users.manage");

  if (!isPrismaConfigured()) {
    return { ok: false, error: SERVICE_ROLE_ERROR };
  }

  const parsed = accountStatusSchema.safeParse({
    user_id: formData.get("user_id") ?? "",
    status: formData.get("status") ?? "",
    reason: formData.get("reason") ?? "",
  });
  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.issues[0]?.message ?? "That account change was not valid.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const { user_id: targetId, status, reason } = parsed.data;

  try {
    const directory = await readAccountDirectory();
    const target = directory.get(targetId);
    if (!target) {
      return {
        ok: false,
        error: "That account no longer exists. Refresh and try again.",
      };
    }

    const otherSuperAdmins = [...directory.values()].filter(
      (user) => user.id !== targetId && user.role === "super_admin",
    ).length;
    const check = evaluateAccountStatusChange({
      actorId: actor.id,
      targetId,
      targetRole: target.role,
      status,
      otherSuperAdmins,
    });
    if (!check.ok) return { ok: false, error: check.error };

    await setAccountStatusRpc({ actor, userId: targetId, status, reason });

    revalidateAccountSurfaces();
    return { ok: true, message: successMessage(status) };
  } catch (error) {
    return { ok: false, error: storageError(error) };
  }
}

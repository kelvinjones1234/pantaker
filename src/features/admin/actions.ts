"use server";

import { revalidatePath } from "next/cache";
import { requireAdminPermissionForAction } from "@/features/admin/authorization";
import { getAdminRole, type AdminRole } from "@/features/admin/roles";
import { getPrisma, isPrismaConfigured } from "@/lib/prisma";
import { withUserContext } from "@/lib/db/context";
import {
  grantAdminRoleSchema,
  revokeAdminRoleSchema,
} from "@/lib/validation/admin";

export type AdminActionResult =
  | { ok: true; message?: string }
  | {
      ok: false;
      error?: string;
      errors?: Record<string, string[] | undefined>;
    };

const SERVICE_ROLE_ERROR = "Managing admins needs database configuration.";
const LAST_SUPER_ADMIN_ERROR =
  "Pantaker needs at least one super admin. Promote another account first.";
const UPDATE_ERROR = "Could not update that account's role. Please try again.";

async function readAdminDirectory(): Promise<Map<string, AdminRole | null>> {
  const directory = new Map<string, AdminRole | null>();
  const users = await getPrisma().user.findMany({
    select: { id: true, admin_role: true },
  });
  for (const user of users) directory.set(user.id, getAdminRole(user));
  return directory;
}

function countSuperAdmins(directory: Map<string, AdminRole | null>): number {
  let count = 0;
  for (const role of directory.values()) if (role === "super_admin") count += 1;
  return count;
}

/**
 * Grant or change an account's admin role. The caller must hold `admins.manage`
 * (super admins only). The role is written to the server-owned `users.admin_role`
 * column, never to profile data or client-supplied claims.
 */
export async function grantAdminRoleAction(
  formData: FormData,
): Promise<AdminActionResult> {
  const actor = await requireAdminPermissionForAction("admins.manage");

  if (!isPrismaConfigured()) return { ok: false, error: SERVICE_ROLE_ERROR };

  const parsed = grantAdminRoleSchema.safeParse({
    user_id: formData.get("user_id"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }

  const { user_id: targetId, role: nextRole } = parsed.data;

  try {
    const directory = await readAdminDirectory();
    const previousRole = directory.get(targetId) ?? null;

    if (
      previousRole === "super_admin" &&
      nextRole !== "super_admin" &&
      countSuperAdmins(directory) <= 1
    ) {
      return { ok: false, error: LAST_SUPER_ADMIN_ERROR };
    }

    await withUserContext(actor, async (tx) => {
      await tx.user.update({
        where: { id: targetId },
        data: { admin_role: nextRole, session_version: { increment: 1 } },
      });
      await tx.adminAuditEvent.create({
        data: {
          actor_id: actor.id,
          action: "admin.role_granted",
          target_type: "user",
          target_id: targetId,
          before: { role: previousRole },
          after: { role: nextRole },
        },
      });
    });
  } catch {
    return { ok: false, error: UPDATE_ERROR };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/admins");
  return { ok: true, message: "Admin role saved." };
}

/**
 * Revoke an account's admin access by clearing `users.admin_role`. Guarded by
 * `admins.manage`, and refuses to remove the last super admin.
 */
export async function revokeAdminRoleAction(
  formData: FormData,
): Promise<AdminActionResult> {
  const actor = await requireAdminPermissionForAction("admins.manage");

  if (!isPrismaConfigured()) return { ok: false, error: SERVICE_ROLE_ERROR };

  const parsed = revokeAdminRoleSchema.safeParse({
    user_id: formData.get("user_id"),
  });
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }

  const targetId = parsed.data.user_id;

  try {
    const directory = await readAdminDirectory();
    const previousRole = directory.get(targetId) ?? null;

    if (previousRole === "super_admin" && countSuperAdmins(directory) <= 1) {
      return { ok: false, error: LAST_SUPER_ADMIN_ERROR };
    }

    await withUserContext(actor, async (tx) => {
      await tx.user.update({
        where: { id: targetId },
        data: { admin_role: null, session_version: { increment: 1 } },
      });
      await tx.adminAuditEvent.create({
        data: {
          actor_id: actor.id,
          action: "admin.role_revoked",
          target_type: "user",
          target_id: targetId,
          before: { role: previousRole },
          after: { role: null },
        },
      });
    });
  } catch {
    return { ok: false, error: UPDATE_ERROR };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/admins");
  return { ok: true, message: "Admin access revoked." };
}

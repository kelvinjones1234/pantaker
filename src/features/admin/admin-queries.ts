import { readAccountDirectory } from "@/features/admin/account-queries";
import type { AdminRole } from "@/features/admin/roles";
import { isPrismaConfigured } from "@/lib/prisma";

export interface AdminRoleRow {
  id: string;
  email: string | null;
  role: AdminRole;
  lastSignInAt: string | null;
  createdAt: string;
}

export type AdminRoleResult =
  { ok: true; rows: AdminRoleRow[] } | { ok: false; error: string };

export async function loadAdminRoleRows(): Promise<AdminRoleResult> {
  if (!isPrismaConfigured()) {
    return {
      ok: false,
      error: "Managing admins needs database configuration.",
    };
  }

  try {
    const directory = await readAccountDirectory();
    const rows = [...directory.values()]
      .flatMap((user) =>
        user.role
          ? [
              {
                id: user.id,
                email: user.email,
                role: user.role,
                lastSignInAt: user.last_sign_in_at,
                createdAt: user.created_at,
              },
            ]
          : [],
      )
      .sort(
        (a, b) =>
          a.role.localeCompare(b.role) ||
          (a.email ?? "").localeCompare(b.email ?? ""),
      );

    return { ok: true, rows };
  } catch {
    return {
      ok: false,
      error: "Could not load admin accounts. Please try again.",
    };
  }
}

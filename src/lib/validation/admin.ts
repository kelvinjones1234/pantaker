import { z } from "zod";
import { ADMIN_ROLES, type AdminRole } from "@/features/admin/roles";

/**
 * Admin role-management input. Only the two canonical roles can ever be granted;
 * the legacy "admin" value is accepted for reading but is never written back, so
 * new grants always carry an explicit role.
 */
export const adminRoleSchema = z.enum(
  ADMIN_ROLES as unknown as [AdminRole, ...AdminRole[]],
  { errorMap: () => ({ message: "Choose a valid admin role." }) },
);

const userId = z.string().uuid("Choose a valid account.");

export const grantAdminRoleSchema = z.object({
  user_id: userId,
  role: adminRoleSchema,
});

export type GrantAdminRoleInput = z.infer<typeof grantAdminRoleSchema>;

export const revokeAdminRoleSchema = z.object({
  user_id: userId,
});

export type RevokeAdminRoleInput = z.infer<typeof revokeAdminRoleSchema>;

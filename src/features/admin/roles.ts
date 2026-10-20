import type { User } from "@/generated/prisma/client";

/**
 * Pantaker admin roles and permissions.
 *
 * The ONLY place an admin role is stored is `public.users.admin_role`, which is
 * server-controlled through Prisma admin actions. The app never reads a role
 * from editable profile data or client-supplied session claims.
 *
 * Two roles exist: `super_admin` (full control, including managing admins) and
 * `moderator` (day-to-day moderation and support). The legacy `"admin"` claim is
 * still accepted and normalized to `super_admin`, so existing admins keep working
 * with no data migration.
 *
 * Permissions are actions on resources and are mapped to roles below. Database
 * authorization is no longer policy-driven; every admin page/action must use
 * these guards.
 */

export type AdminRole = "super_admin" | "moderator";

export const ADMIN_ROLES: readonly AdminRole[] = ["super_admin", "moderator"];

/** Legacy claim value that meant "admin"; read as `super_admin`. */
export const LEGACY_ADMIN_ROLE = "admin";

/** Explicit non-admin claim written when an admin is revoked. */
export const NO_ADMIN_ROLE = "user";

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: "Super admin",
  moderator: "Moderator",
};

export const ADMIN_ROLE_DESCRIPTIONS: Record<AdminRole, string> = {
  super_admin: "Full control, including adding and removing admins.",
  moderator: "Reviews listings, handles reports, and views accounts and analytics.",
};

export type AdminPermission =
  | "listings.review"
  | "reports.manage"
  | "users.view"
  | "users.manage"
  | "analytics.view"
  | "admins.manage";

export const ADMIN_PERMISSIONS: readonly AdminPermission[] = [
  "listings.review",
  "reports.manage",
  "users.view",
  "users.manage",
  "analytics.view",
  "admins.manage",
];

export const ADMIN_PERMISSION_LABELS: Record<AdminPermission, string> = {
  "listings.review": "Review listings",
  "reports.manage": "Handle reports",
  "users.view": "View users",
  "users.manage": "Edit users",
  "analytics.view": "View analytics",
  "admins.manage": "Manage admins",
};

const ROLE_PERMISSIONS: Record<AdminRole, readonly AdminPermission[]> = {
  super_admin: ADMIN_PERMISSIONS,
  moderator: ["listings.review", "reports.manage", "users.view", "analytics.view"],
};

/** Normalize a stored claim value to a known role, or null for non-admins. */
export function normalizeAdminRole(value: unknown): AdminRole | null {
  if (typeof value !== "string") return null;
  const role = value.trim().toLowerCase();
  if (role === LEGACY_ADMIN_ROLE) return "super_admin";
  return (ADMIN_ROLES as readonly string[]).includes(role) ? (role as AdminRole) : null;
}

/** The admin role from a session's server-controlled claim, or null. */
export function getAdminRole(
  user: Pick<User, "admin_role"> | null | undefined,
): AdminRole | null {
  if (!user) return null;
  return normalizeAdminRole(user.admin_role);
}

/** True for any recognized admin role (super_admin or moderator). */
export function isAdminUser(user: Pick<User, "admin_role"> | null | undefined): boolean {
  return getAdminRole(user) !== null;
}

export function permissionsForRole(role: AdminRole | null): readonly AdminPermission[] {
  return role ? ROLE_PERMISSIONS[role] : [];
}

/** True only when the session's role grants the action on the resource. */
export function hasAdminPermission(
  user: Pick<User, "admin_role"> | null | undefined,
  permission: AdminPermission,
): boolean {
  return permissionsForRole(getAdminRole(user)).includes(permission);
}

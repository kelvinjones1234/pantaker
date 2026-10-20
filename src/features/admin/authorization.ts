import { notFound, redirect } from "next/navigation";
import type { User } from "@/generated/prisma/client";
import { getAuthUser } from "@/features/auth/queries";
import { loginRedirectPath } from "@/features/auth/redirect";
import { getAccountAccessState } from "@/features/accounts/access";
import {
  hasAdminPermission,
  isAdminUser,
  type AdminPermission,
} from "@/features/admin/roles";

/**
 * Admin authorization.
 *
 * Pantaker has no separate admin accounts: an admin is the same user row used
 * everywhere else. The only safe place for a role is `public.users.admin_role`,
 * written only by server-side admin mutations. Editable profile data and
 * client-supplied claims are deliberately never consulted.
 *
 * The role vocabulary and the action/resource permission map live in
 * src/features/admin/roles.ts. `requireAdmin` establishes "this is some admin";
 * the permission guards establish "this admin may do this specific thing". Every
 * admin page, route handler and mutation must use a guard — hiding a button in
 * the UI is never sufficient.
 */

export { isAdminUser };

/** The signed-in admin of any role, or null. Reads only the database role. */
export async function getAdminUser(): Promise<User | null> {
  const user = await getAuthUser().catch(() => null);
  return isAdminUser(user) ? user : null;
}

/**
 * Guard for admin pages that only require *any* admin. An anonymous visitor is
 * sent to the app's existing sign-in flow (and returned to `next` afterwards); a
 * signed-in non-admin gets the standard 404, so the admin surface is neither
 * usable nor disclosed.
 *
 * Unlike the seller guards there is intentionally NO preview fallback: admin
 * access is never granted without a real admin session, not even in local
 * development.
 */
export async function requireAdmin(next = "/admin"): Promise<User> {
  const user = await getAuthUser().catch(() => null);
  if (!user) redirect(loginRedirectPath(next, "/admin"));
  if (!isAdminUser(user)) notFound();
  const access = await getAccountAccessState().catch(() => null);
  if (access?.status === "suspended") redirect("/account-suspended");
  return user;
}

/**
 * Guard for admin pages that require one specific permission. Same page
 * behaviour as `requireAdmin` (redirect if anonymous, 404 if unauthorized), but
 * a signed-in admin whose role does not grant `permission` also gets the 404 —
 * a moderator is not sent to a tool they cannot use, and the tool is not
 * disclosed to them.
 */
export async function requireAdminPermission(
  permission: AdminPermission,
  next = "/admin",
): Promise<User> {
  const user = await getAuthUser().catch(() => null);
  if (!user) redirect(loginRedirectPath(next, "/admin"));
  if (!hasAdminPermission(user, permission)) notFound();
  const access = await getAccountAccessState().catch(() => null);
  if (access?.status === "suspended") redirect("/account-suspended");
  return user;
}

/** Raised when an admin (or a non-admin) attempts a mutation they may not perform. */
export class AdminAuthorizationError extends Error {
  readonly permission?: AdminPermission;

  constructor(permission?: AdminPermission) {
    super("Admin access required.");
    this.name = "AdminAuthorizationError";
    this.permission = permission;
  }
}

/**
 * Guard for admin server actions and route handlers. Unlike `requireAdmin` this
 * never renders a page and never bounces a signed-in non-admin into one — it
 * redirects only anonymous callers (never previewing) and throws for everyone
 * else, so an admin mutation can never run without the required permission.
 */
export async function requireAdminForAction(): Promise<User> {
  const user = await getAuthUser().catch(() => null);
  if (!user) redirect(loginRedirectPath("/admin", "/admin"));
  if (!isAdminUser(user)) throw new AdminAuthorizationError();
  const access = await getAccountAccessState().catch(() => null);
  if (access?.status === "suspended") throw new AdminAuthorizationError();
  return user;
}

/**
 * Guard for admin mutations that require one specific permission. This is the
 * single check every admin role-management action must pass; it cannot be
 * bypassed by calling the action directly from the client.
 */
export async function requireAdminPermissionForAction(
  permission: AdminPermission,
): Promise<User> {
  const user = await getAuthUser().catch(() => null);
  if (!user) redirect(loginRedirectPath("/admin", "/admin"));
  if (!hasAdminPermission(user, permission)) throw new AdminAuthorizationError(permission);
  const access = await getAccountAccessState().catch(() => null);
  if (access?.status === "suspended") throw new AdminAuthorizationError(permission);
  return user;
}

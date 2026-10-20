import { redirect } from "next/navigation";
import type { User } from "@/generated/prisma/client";
import { getAuthUser } from "@/features/auth/queries";
import { loginRedirectPath } from "@/features/auth/redirect";
import { getAccountAccessState } from "@/features/accounts/access";
import { isPrismaConfigured } from "@/lib/prisma";

/**
 * Server-side access control for seller surfaces. These helpers are the single
 * place seller identity is established. The returned user id always comes from
 * the NextAuth session and must never be replaced with a value from the client.
 */

export function isAuthConfigured(): boolean {
  return isPrismaConfigured() && Boolean(process.env.AUTH_SECRET);
}

/** Matches the existing `/sell` convention: dev, or explicit opt-in, previews. */
export function isPreviewAuthAllowed(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_PREVIEW_AUTH === "true";
}

/** Build a safe sign-in URL that returns the visitor to `next` afterwards. */
export { loginRedirectPath };

/**
 * Guard for seller pages. Returns the signed-in user, or `null` only in local
 * preview mode where the database is not configured. Everyone else is redirected
 * to sign in. Because it returns the database user, pages can trust the id.
 */
export async function requireSeller(next = "/seller"): Promise<User | null> {
  const user = await getAuthUser().catch(() => null);
  if (user) {
    const access = await getAccountAccessState().catch(() => null);
    if (access?.status === "suspended") redirect("/account-suspended");
    return user;
  }
  if (isAuthConfigured() || !isPreviewAuthAllowed()) {
    redirect(loginRedirectPath(next));
  }
  return null;
}

/**
 * Guard for any signed-in page (buyer or seller). Identical behaviour to
 * `requireSeller` — it only establishes that a session exists — but named for
 * buyer-facing surfaces such as the messaging inbox where "seller" would mislead.
 */
export async function requireUser(next = "/"): Promise<User | null> {
  return requireSeller(next);
}

/**
 * Guard for seller server actions and API handlers. Unlike `requireSeller` this
 * never previews: an anonymous caller is redirected to sign in, so mutations can
 * never run without a session.
 */
export async function requireUserForAction(next = "/seller"): Promise<User> {
  const user = await getAuthUser().catch(() => null);
  if (!user) redirect(loginRedirectPath(next));
  const access = await getAccountAccessState().catch(() => null);
  if (access?.status === "suspended") redirect("/account-suspended");
  return user;
}

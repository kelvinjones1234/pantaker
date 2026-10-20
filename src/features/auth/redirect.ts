import { safeRedirectPath } from "@/lib/safe-redirect";

/**
 * Build a safe sign-in URL that returns the visitor to `next` afterwards.
 * `next` is sanitized so a crafted value cannot turn the login bounce into an
 * open redirect.
 */
export function loginRedirectPath(next: string, fallback = "/seller"): string {
  const safe = safeRedirectPath(next, fallback);
  return `/login?next=${encodeURIComponent(safe)}`;
}

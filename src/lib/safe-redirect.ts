/**
 * Only allow same-origin, path-relative redirects. Blocks open-redirect and
 * protocol-relative (`//evil.com`) targets coming from `?next=` params.
 */
export function safeRedirectPath(raw: string | null | undefined, fallback = "/"): string {
  if (!raw) return fallback;
  if (!raw.startsWith("/")) return fallback;
  if (raw.startsWith("//")) return fallback;
  if (raw.includes("\\")) return fallback;
  return raw;
}

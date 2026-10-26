/** Reject cross-site browser mutations while still allowing server-side calls. */
export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    const requestUrl = new URL(request.url);
    const originUrl = new URL(origin);
    if (originUrl.host === requestUrl.host) return true;

    const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
    if (!configured) return false;
    return new URL(configured).host === originUrl.host;
  } catch {
    return false;
  }
}

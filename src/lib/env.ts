const REQUIRED_PRODUCTION_ENV = [
  "DATABASE_URL",
  "AUTH_SECRET",
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_SUPPORT_EMAIL",
] as const;

function isLocalHost(value: string): boolean {
  try {
    const { hostname } = new URL(value);
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return true;
  }
}

function emailIsConfigured(): boolean {
  if (process.env.EMAIL_SERVER?.trim()) return true;
  return Boolean(
    process.env.EMAIL_SERVER_HOST?.trim() &&
      process.env.EMAIL_SERVER_USER?.trim() &&
      process.env.EMAIL_SERVER_PASSWORD?.trim() &&
      process.env.EMAIL_FROM?.trim(),
  );
}

/**
 * Production must fail closed: a deployment with preview fallbacks, a local
 * canonical URL, or no email delivery is not a valid Pantaker environment.
 * Returns a safe message (never a secret value) for middleware to render as 503.
 */
export function productionConfigError(): string | null {
  if (process.env.NODE_ENV !== "production") return null;

  const missing: string[] = REQUIRED_PRODUCTION_ENV.filter((key) => !process.env[key]?.trim());
  if (!emailIsConfigured()) missing.push("EMAIL_SERVER or EMAIL_SERVER_* + EMAIL_FROM");
  if (missing.length > 0) {
    return `Pantaker is not configured for production. Missing: ${missing.join(", ")}.`;
  }

  if (isLocalHost(process.env.NEXT_PUBLIC_SITE_URL ?? "")) {
    return "Pantaker is not configured for production. NEXT_PUBLIC_SITE_URL must be the public site URL.";
  }

  return null;
}

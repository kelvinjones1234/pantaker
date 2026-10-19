import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/features/auth/profile";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { siteConfig } from "@/config/site";

function baseUrl() {
  return siteConfig.url.replace(/\/$/, "");
}

/**
 * Handles both OAuth (Google) and email-confirmation redirects. With the @supabase/ssr
 * PKCE flow both arrive as `?code=...`; we exchange it for a session cookie.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeRedirectPath(searchParams.get("next"), "/");
  const errorDescription = searchParams.get("error_description");

  if (errorDescription) {
    return NextResponse.redirect(
      `${baseUrl()}/login?error=${encodeURIComponent(errorDescription)}`,
    );
  }

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      try {
        await ensureProfile(data.user);
      } catch {
        // Best-effort mirror; do not block the sign-in.
      }
      return NextResponse.redirect(`${baseUrl()}${next}`);
    }
  }

  return NextResponse.redirect(
    `${baseUrl()}/login?error=${encodeURIComponent("That sign-in link is invalid or has expired.")}`,
  );
}

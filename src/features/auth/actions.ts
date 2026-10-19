"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { emailOtpRequestSchema, emailOtpVerifySchema } from "@/lib/validation/auth";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { siteConfig } from "@/config/site";
import { ensureProfile } from "@/features/auth/profile";
import type { AuthActionState, GoogleSignInResult } from "@/features/auth/types";

function isConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

function origin() {
  return siteConfig.url.replace(/\/$/, "");
}

function readNext(formData: FormData): string {
  const raw = formData.get("next");
  return safeRedirectPath(typeof raw === "string" ? raw : null, "/");
}

/**
 * Step 1 of passwordless email auth: email a one-time code. New emails create
 * an account automatically, so sign-up and sign-in share this one action.
 */
export async function requestEmailCodeAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!isConfigured()) {
    return {
      status: "error",
      message: "Sign-in needs Supabase configuration. See the README to connect a project.",
    };
  }

  const parsed = emailOtpRequestSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { status: "error", errors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email.toLowerCase(),
    options: { shouldCreateUser: true },
  });

  if (error) {
    return { status: "error", message: error.message };
  }

  return {
    status: "code_sent",
    message: "Enter the 6-digit code we emailed you. Check your spam folder if it hasn't arrived.",
  };
}

/**
 * Step 2: verify the emailed code. On success a session cookie is set, the
 * profile is mirrored, and the visitor is redirected to their destination.
 */
export async function verifyEmailCodeAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!isConfigured()) {
    return {
      status: "error",
      message: "Sign-in needs Supabase configuration. See the README to connect a project.",
    };
  }

  const parsed = emailOtpVerifySchema.safeParse({
    email: formData.get("email"),
    token: formData.get("token"),
  });
  if (!parsed.success) {
    return { status: "error", errors: parsed.error.flatten().fieldErrors };
  }

  const next = readNext(formData);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email: parsed.data.email.toLowerCase(),
    token: parsed.data.token,
    type: "email",
  });

  if (error) {
    if (/expired|invalid|token/i.test(error.message)) {
      return {
        status: "error",
        errors: { token: ["That code is invalid or has expired. Request a new one."] },
      };
    }
    return { status: "error", message: error.message };
  }

  if (data.user) {
    try {
      await ensureProfile(data.user);
    } catch {
      // Profile mirror is best-effort; the session is still valid.
    }
    redirect(next);
  }

  return { status: "error", message: "Could not verify that code. Please try again." };
}

export async function startGoogleSignIn(next?: string): Promise<GoogleSignInResult> {
  if (!isConfigured()) {
    return { ok: false, error: "Google sign-in needs Supabase configuration." };
  }
  const target = safeRedirectPath(next ?? null, "/");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin()}/auth/callback?next=${encodeURIComponent(target)}`,
      queryParams: { access_type: "offline", prompt: "consent" },
    },
  });

  if (error || !data.url) {
    return { ok: false, error: error?.message ?? "Could not start Google sign-in." };
  }
  return { ok: true, url: data.url };
}

export async function signOutAction() {
  if (isConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}

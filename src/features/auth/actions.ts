"use server";

import { headers } from "next/headers";
import { signOut } from "@/auth";
import { cancelLoginCode, issueLoginCode, normalizeEmail } from "@/lib/auth/otp";
import { sendLoginCodeEmail } from "@/lib/auth/email";
import { emailOtpRequestSchema } from "@/lib/validation/auth";
import { isPrismaConfigured } from "@/lib/prisma";
import type { AuthActionState } from "@/features/auth/types";

function clientIp(value: string | null): string | null {
  if (!value) return null;
  const first = value.split(",")[0]?.trim();
  return first || null;
}

/**
 * Step 1 of passwordless email auth: email a one-time code. New emails create
 * an account automatically, so sign-up and sign-in share this one action.
 */
export async function requestEmailCodeAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!isPrismaConfigured() || !process.env.AUTH_SECRET) {
    return {
      status: "error",
      message: "Sign-in is not configured yet. Add the database and AUTH_SECRET to .env.",
    };
  }

  const parsed = emailOtpRequestSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { status: "error", errors: parsed.error.flatten().fieldErrors };
  }

  const email = normalizeEmail(parsed.data.email);
  const requestHeaders = await headers();
  const ip = clientIp(requestHeaders.get("x-forwarded-for"));

  try {
    const issued = await issueLoginCode(email, ip);
    if (!issued.ok) {
      return {
        status: "error",
        message:
          issued.reason === "cooldown"
            ? "Please wait a minute before requesting another code."
            : "Too many codes requested. Try again later.",
      };
    }

    try {
      await sendLoginCodeEmail(email, issued.code);
    } catch {
      await cancelLoginCode(issued.id);
      return {
        status: "error",
        message: "We couldn't send the email just now. Check your address and try again.",
      };
    }

    return {
      status: "code_sent",
      message: "Enter the 6-digit code we emailed you. Check your spam folder if it hasn't arrived.",
    };
  } catch {
    return {
      status: "error",
      message: "We couldn't send a code just now. Please try again.",
    };
  }
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}

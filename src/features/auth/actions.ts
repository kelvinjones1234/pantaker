"use server";

import { headers } from "next/headers";
import { signOut } from "@/auth";
import { hashPassword } from "@/lib/auth/password";
import { cancelSignupCode, issueSignupCode, normalizeEmail } from "@/lib/auth/otp";
import { sendSignupCodeEmail } from "@/lib/auth/email";
import { signupRequestSchema } from "@/lib/validation/auth";
import { getPrisma, isPrismaConfigured } from "@/lib/prisma";
import type { AuthActionState } from "@/features/auth/types";

function clientIp(value: string | null): string | null {
  if (!value) return null;
  const first = value.split(",")[0]?.trim();
  return first || null;
}

/**
 * Sign-up step 1: validate the new account details and email a one-time code.
 * The password is hashed immediately and held with the code until verification.
 */
export async function requestSignupCodeAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!isPrismaConfigured() || !process.env.AUTH_SECRET) {
    return {
      status: "error",
      message: "Sign-up is not configured yet. Add the database and AUTH_SECRET to .env.",
    };
  }

  const parsed = signupRequestSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { status: "error", errors: parsed.error.flatten().fieldErrors };
  }

  const email = normalizeEmail(parsed.data.email);

  try {
    const existing = await getPrisma().user.findUnique({
      where: { email },
      select: { password_hash: true },
    });
    if (existing?.password_hash) {
      return {
        status: "error",
        errors: {
          email: ["An account with this email already exists. Sign in instead."],
        },
      };
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const requestHeaders = await headers();
    const ip = clientIp(requestHeaders.get("x-forwarded-for"));

    const issued = await issueSignupCode(email, passwordHash, ip);
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
      await sendSignupCodeEmail(email, issued.code);
    } catch {
      await cancelSignupCode(issued.id);
      return {
        status: "error",
        message: "We couldn't send the email just now. Check your address and try again.",
      };
    }

    return {
      status: "code_sent",
      message: "Enter the 6-digit code we emailed you to finish creating your account.",
    };
  } catch {
    return {
      status: "error",
      message: "We couldn't create your account just now. Please try again.",
    };
  }
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}

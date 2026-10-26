"use server";

import { createHash, randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { signOut } from "@/auth";
import { requireUserForAction } from "@/features/auth/authorization";
import { deleteAccountCompletely } from "@/features/accounts/deletion";
import { getPrisma, isPrismaConfigured } from "@/lib/prisma";
import { emailSchema } from "@/lib/validation/auth";
import { sendEmailChangeEmail } from "@/lib/auth/email";
import { siteConfig } from "@/config/site";
import {
  deleteAccountSchema,
  listingPreferencesSchema,
  type ListingPreferencesInput,
} from "@/lib/validation/settings";

export type SettingsActionResult =
  | { ok: true; message?: string }
  | {
      ok: false;
      error?: string;
      errors?: Record<string, string[] | undefined>;
    };

/**
 * Persist listing-preference defaults for the signed-in seller. The row id is
 * always the session user id; no id is ever read from the request.
 */
export async function updateListingPreferencesAction(
  formData: FormData,
): Promise<SettingsActionResult> {
  const user = await requireUserForAction(
    "/seller/settings/listing-preferences",
  );

  const parsed = listingPreferencesSchema.safeParse({
    default_area: formData.get("default_area"),
    default_pickup_notes: formData.get("default_pickup_notes"),
  });
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }
  if (!isPrismaConfigured()) {
    return {
      ok: false,
      error: "Saving preferences needs database configuration.",
    };
  }

  const prefs: ListingPreferencesInput = parsed.data;

  try {
    await getPrisma().profile.upsert({
      where: { id: user.id },
      create: { id: user.id, ...prefs },
      update: { ...prefs },
    });
  } catch {
    return {
      ok: false,
      error: "Could not save your preferences. Please try again.",
    };
  }

  revalidatePath("/sell");
  revalidatePath("/seller/settings/listing-preferences");
  return { ok: true, message: "Listing preferences saved." };
}

/**
 * Start an email change. A confirmation link is sent to the new address; the
 * current address stays active until that link is opened.
 */
export async function changeEmailAction(
  formData: FormData,
): Promise<SettingsActionResult> {
  const user = await requireUserForAction("/seller/settings/account");

  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) {
    return {
      ok: false,
      errors: { email: parsed.error.issues.map((issue) => issue.message) },
    };
  }

  const nextEmail = parsed.data.toLowerCase();
  if (nextEmail === user.email.toLowerCase()) {
    return {
      ok: false,
      errors: { email: ["That is already your email address."] },
    };
  }

  const prisma = getPrisma();
  const existing = await prisma.user.findUnique({
    where: { email: nextEmail },
    select: { id: true },
  });
  if (existing) {
    return { ok: false, errors: { email: ["That email can't be used."] } };
  }

  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

  try {
    await prisma.$transaction([
      prisma.emailChangeRequest.updateMany({
        where: { user_id: user.id, consumed_at: null },
        data: { consumed_at: new Date() },
      }),
      prisma.emailChangeRequest.create({
        data: {
          user_id: user.id,
          new_email: nextEmail,
          token_hash: tokenHash,
          expires_at: expiresAt,
        },
      }),
      prisma.notification.create({
        data: {
          user_id: user.id,
          type: "account_email_change",
          title: "Confirm your new email",
          body: "We sent a confirmation link to your new address. Your current email stays active until you confirm.",
          href: "/seller/settings/account",
        },
      }),
    ]);
  } catch {
    return {
      ok: false,
      error: "Could not start the email change. Please try again.",
    };
  }

  const confirmUrl = `${siteConfig.url.replace(/\/$/, "")}/seller/settings/account/confirm-email?token=${encodeURIComponent(token)}`;

  try {
    await sendEmailChangeEmail(nextEmail, confirmUrl);
  } catch {
    return {
      ok: false,
      error:
        "We couldn't send the confirmation email. Check the address and try again.",
    };
  }

  return {
    ok: true,
    message: `We've sent a confirmation link to ${nextEmail}. Your current address stays active until you confirm.`,
  };
}

/**
 * Confirm an email change from the link sent to the new address. The token is
 * hashed at rest, single-use, and expires after 30 minutes.
 */
export async function confirmEmailChangeAction(
  formData: FormData,
): Promise<void> {
  const token = String(formData.get("token") ?? "").trim();
  if (!token) redirect("/login?email=invalid");

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const prisma = getPrisma();
  const request = await prisma.emailChangeRequest.findUnique({
    where: { token_hash: tokenHash },
    include: { user: { select: { id: true, email: true } } },
  });

  const errorRedirect = (reason: string): never =>
    redirect(
      `/seller/settings/account/confirm-email?token=${encodeURIComponent(token)}&error=${reason}`,
    );

  if (
    !request ||
    request.consumed_at ||
    request.expires_at.getTime() <= Date.now()
  ) {
    return errorRedirect("invalid");
  }

  const existing = await prisma.user.findUnique({
    where: { email: request.new_email },
    select: { id: true },
  });
  if (existing && existing.id !== request.user_id) return errorRedirect("taken");

  try {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: request.user_id },
        data: {
          email: request.new_email,
          email_verified: new Date(),
          session_version: { increment: 1 },
        },
      }),
      prisma.emailChangeRequest.update({
        where: { id: request.id },
        data: { consumed_at: new Date() },
      }),
      prisma.emailChangeRequest.updateMany({
        where: {
          user_id: request.user_id,
          id: { not: request.id },
          consumed_at: null,
        },
        data: { consumed_at: new Date() },
      }),
    ]);
  } catch {
    return errorRedirect("failed");
  }

  await signOut({ redirectTo: "/login?email=updated" });
}

/** Sign out of every device for this account by invalidating its JWT version. */
export async function signOutAllDevicesAction(): Promise<void> {
  const user = await requireUserForAction(
    "/seller/settings/security",
  );
  await getPrisma().user.update({
    where: { id: user.id },
    data: { session_version: { increment: 1 } },
  });
  await signOut({ redirectTo: "/" });
}

/**
 * Delete the signed-in account. Destructive and irreversible, so it requires
 * the typed confirmation phrase.
 */
export async function requestAccountDeletionAction(
  formData: FormData,
): Promise<SettingsActionResult> {
  const user = await requireUserForAction(
    "/seller/settings/security",
  );

  const parsed = deleteAccountSchema.safeParse({
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      errors: { confirm: parsed.error.issues.map((issue) => issue.message) },
    };
  }

  const removed = await deleteAccountCompletely(user.id, user.id);
  if (!removed.ok) return { ok: false, error: removed.error };

  await signOut({ redirectTo: "/?account=deleted" });
  return { ok: true };
}

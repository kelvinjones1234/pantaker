import type { Metadata } from "next";
import Link from "next/link";
import { createHash } from "node:crypto";
import { confirmEmailChangeAction } from "@/features/settings/actions";
import { getPrisma, isPrismaConfigured } from "@/lib/prisma";
import { SellerPageHeader } from "@/components/seller/SellerPageHeader";
import { SettingsCard } from "@/components/seller/SettingsCard";

export const metadata: Metadata = {
  title: "Confirm email change — Pantaker",
};

const ERROR_MESSAGES: Record<string, string> = {
  invalid:
    "That confirmation link is invalid or has expired. Request a new one.",
  taken: "That email address is no longer available. Request a different one.",
  failed: "We couldn't update your email. Please try again.",
};

export default async function ConfirmEmailChangePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;
  const reason = error
    ? (ERROR_MESSAGES[error] ?? ERROR_MESSAGES.failed)
    : null;

  let pendingEmail: string | null = null;
  if (token && isPrismaConfigured()) {
    const request = await getPrisma().emailChangeRequest.findUnique({
      where: { token_hash: createHash("sha256").update(token).digest("hex") },
      select: { new_email: true, consumed_at: true, expires_at: true },
    });
    if (
      request &&
      !request.consumed_at &&
      request.expires_at.getTime() > Date.now()
    ) {
      pendingEmail = request.new_email;
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5 px-4 py-8 sm:px-6">
      <SellerPageHeader
        title="Confirm email change"
        description="Your current email stays active until you confirm the new address."
      />

      <SettingsCard title="New email address">
        {reason ? (
          <p
            role="alert"
            className="text-[13px] leading-relaxed text-[var(--color-error)]"
          >
            {reason}
          </p>
        ) : pendingEmail ? (
          <form
            action={confirmEmailChangeAction}
            className="flex flex-col gap-4"
          >
            <input type="hidden" name="token" value={token} />
            <p className="text-[13px] leading-relaxed text-[var(--color-ash-veil)]">
              Confirm that{" "}
              <strong className="text-[var(--color-ink-black)]">
                {pendingEmail}
              </strong>{" "}
              should become your Pantaker sign-in address. You&apos;ll be signed
              out and can sign in again with a code sent to the new address.
            </p>
            <button
              type="submit"
              className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full bg-[var(--color-shop-violet)] px-5 text-sm font-semibold text-[var(--color-pure-white)] transition-colors duration-200 hover:bg-[var(--color-primary-hover)]"
            >
              Confirm new email
            </button>
          </form>
        ) : (
          <p className="text-[13px] leading-relaxed text-[var(--color-ash-veil)]">
            This confirmation link is invalid or has expired. Request a new one
            from{" "}
            <Link
              href="/seller/settings/account"
              className="font-semibold text-[var(--color-shop-violet)] underline"
            >
              account settings
            </Link>
            .
          </p>
        )}
      </SettingsCard>
    </div>
  );
}

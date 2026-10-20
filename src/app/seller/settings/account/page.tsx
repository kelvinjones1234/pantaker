import type { Metadata } from "next";
import Link from "next/link";
import { requireSeller } from "@/features/auth/authorization";
import { getAuthUser } from "@/features/auth/queries";
import { SellerPageHeader } from "@/components/seller/SellerPageHeader";
import { SettingsCard, SettingsRow } from "@/components/seller/SettingsCard";
import { EmailChangeForm } from "@/components/seller/EmailChangeForm";
import { ArrowRightIcon } from "@/components/brand/icons";

export const metadata: Metadata = {
  title: "Account settings — Pantaker",
  description:
    "Manage the email address and sign-in method for your Pantaker account.",
};

export default async function AccountSettingsPage() {
  await requireSeller("/seller/settings/account");
  const user = await getAuthUser();

  const isLive = Boolean(user);
  const email = user?.email ?? "";

  return (
    <div className="flex flex-col gap-5">
      <SellerPageHeader
        title="Account"
        description="Your sign-in identity. Pantaker is passwordless — you sign in with a one-time code, so there's no password to manage."
      />

      <SettingsCard
        title="Email address"
        description="Used to sign in and to reach you about your account. We'll email a confirmation link before any change takes effect."
      >
        {isLive ? (
          <EmailChangeForm currentEmail={email} isLive />
        ) : (
          <p className="text-[12px] leading-relaxed text-[var(--color-muted-gray)]">
            {isLive
              ? "Sign in to change your email address."
              : "Preview mode — connect a database to manage a real email address."}
          </p>
        )}
      </SettingsCard>

      <SettingsCard
        title="Sign-in methods"
        description="How you can get into your account today."
      >
        <div>
          <SettingsRow
            label="Email one-time code"
            note="Enter the 6-digit code we email you — no password needed."
            value="Always available"
          />
        </div>
      </SettingsCard>

      <SettingsCard
        title="Profile details"
        description="Your public-facing identity — display name, username, photo, location, and bio."
      >
        <Link
          href="/seller/profile"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] px-5 text-sm font-semibold text-[var(--color-ink-black)] transition-colors duration-150 hover:border-[var(--color-ink-30)]"
        >
          Manage profile
          <ArrowRightIcon className="h-4 w-4" />
        </Link>
      </SettingsCard>
    </div>
  );
}

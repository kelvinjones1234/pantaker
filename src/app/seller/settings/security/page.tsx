import type { Metadata } from "next";
import Link from "next/link";
import { requireSeller } from "@/features/auth/authorization";
import { getAuthUser, getProfile } from "@/features/auth/queries";
import { isPrismaConfigured } from "@/lib/prisma";
import { SellerPageHeader } from "@/components/seller/SellerPageHeader";
import { SettingsCard, SettingsRow } from "@/components/seller/SettingsCard";
import { SignOutAllButton } from "@/components/seller/SignOutAllButton";
import { DeleteAccountPanel } from "@/components/seller/DeleteAccountPanel";

export const metadata: Metadata = {
  title: "Security — Pantaker",
  description:
    "Sign out, recover access, or permanently close your Pantaker account.",
};

export default async function SecurityPage() {
  await requireSeller("/seller/settings/security");
  const [user, profile] = await Promise.all([getAuthUser(), getProfile()]);

  const isLive = Boolean(user);

  return (
    <div className="flex flex-col gap-5">
      <SellerPageHeader
        title="Security"
        description="Session controls, account recovery, and closing your account. Destructive actions ask you to confirm first."
      />

      <SettingsCard
        title="Sessions"
        description="Signing out ends your session on this device. Use the option below to end it everywhere."
      >
        <div className="flex flex-col gap-3">
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full bg-[var(--color-shop-violet)] px-5 text-sm font-semibold text-[var(--color-pure-white)] transition-colors duration-200 hover:bg-[var(--color-primary-hover)]"
            >
              Sign out
            </button>
          </form>
          <SignOutAllButton isLive={isLive} />
        </div>
      </SettingsCard>

      <SettingsCard
        title="Recovering access"
        description="Pantaker is passwordless, so recovery means getting a fresh sign-in code."
      >
        <div>
          <SettingsRow
            label="Lost access to your email"
            note="If you can't receive the code, contact Pantaker support so we can help you regain access."
            value={isLive ? "Email code" : "Not configured"}
          />
          <SettingsRow
            label="Account email"
            note="Change it from Account settings; the new address must be confirmed before it takes over."
            trailing={
              <Link
                href="/seller/settings/account"
                className="shrink-0 text-[12px] font-semibold text-[var(--color-shop-violet)] underline"
              >
                Change
              </Link>
            }
          />
        </div>
        <div className="mt-4">
          <Link
            href="/login"
            className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] px-5 text-sm font-semibold text-[var(--color-ink-black)] transition-colors duration-150 hover:border-[var(--color-ink-30)]"
          >
            Request a new sign-in code
          </Link>
        </div>
      </SettingsCard>

      <SettingsCard
        title="Delete account"
        description="Your account and its data are removed immediately after you confirm. You will be signed out."
      >
        <DeleteAccountPanel
          isLive={isLive && isPrismaConfigured()}
          requestedAt={
            profile?.deletion_requested_at
              ? new Date(profile.deletion_requested_at).toLocaleDateString(
                  "en-NG",
                  {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  },
                )
              : null
          }
        />
      </SettingsCard>
    </div>
  );
}

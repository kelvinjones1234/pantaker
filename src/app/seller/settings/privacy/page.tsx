import type { Metadata } from "next";
import Link from "next/link";
import { requireSeller } from "@/features/auth/authorization";
import { getProfile } from "@/features/auth/queries";
import { SellerPageHeader } from "@/components/seller/SellerPageHeader";
import { SettingsCard, SettingsRow } from "@/components/seller/SettingsCard";
import { ArrowRightIcon } from "@/components/brand/icons";

export const metadata: Metadata = {
  title: "Privacy and safety — Pantaker",
  description: "What buyers can see about you, and the safety tools Pantaker supports.",
};

export default async function PrivacySettingsPage() {
  await requireSeller("/seller/settings/privacy");
  const profile = await getProfile();
  const hasSocials = Boolean(
    profile?.instagram_handle ||
      profile?.x_handle ||
      profile?.facebook_handle ||
      profile?.tiktok_handle,
  );

  return (
    <div className="flex flex-col gap-5">
      <SellerPageHeader
        title="Privacy and safety"
        description="What buyers can see, what Pantaker never collects, and which safety tools exist today."
      />

      <SettingsCard
        title="What buyers can see"
        description="Pantaker has no separate public profile page. These details appear alongside your listings."
      >
        <div>
          <SettingsRow
            label="Display name"
            value={profile?.display_name?.trim() || "Not set"}
          />
          <SettingsRow label="Username" value={profile?.username ? `@${profile.username}` : "Not set"} />
          <SettingsRow label="Photo" value={profile?.avatar_path ? "Shown" : "Not set"} />
          <SettingsRow
            label="Location"
            value={profile?.area || profile?.city || "Not set"}
          />
          <SettingsRow label="Bio" value={profile?.bio?.trim() ? "Shown" : "Not set"} />
          <SettingsRow
            label="Phone"
            value={profile?.phone?.trim() ? "Shown" : "Not set"}
          />
          <SettingsRow
            label="WhatsApp"
            value={
              profile?.phone?.trim() && profile.phone_is_whatsapp
                ? "Shown"
                : "Not set"
            }
          />
          <SettingsRow label="Social links" value={hasSocials ? "Shown" : "Not set"} />
        </div>
        <div className="mt-4">
          <Link
            href="/seller/profile"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] px-5 text-sm font-semibold text-[var(--color-ink-black)] transition-colors duration-150 hover:border-[var(--color-ink-30)]"
          >
            Edit what&apos;s shown
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>
      </SettingsCard>

      <SettingsCard
        title="Contact details"
        description="Optional contact details you add to your profile are shown on your published listings."
      >
        <p className="text-[13px] leading-relaxed text-[var(--color-ink-black)]">
          Buyers can call the phone number you add, open WhatsApp when you mark the number as on
          WhatsApp, and visit any social handles you link. Leave a field blank to hide it. Your
          sign-in email is never shown to buyers.
        </p>
      </SettingsCard>

      <SettingsCard
        title="Blocking"
        description="You control who can message you from a conversation."
      >
        <p className="text-[13px] leading-relaxed text-[var(--color-ink-black)]">
          Blocking someone stops new messages between you in both directions. You can manage blocks
          from the conversation itself. If a listing also breaks the marketplace rules, report it so a
          moderator can review it.
        </p>
      </SettingsCard>

      <SettingsCard
        title="Reporting"
        description="Reports are recorded against the listing and the person who filed them."
      >
        <p className="text-[13px] leading-relaxed text-[var(--color-ink-black)]">
          When a listing is reported, Pantaker stores the reason and details with the listing. Sellers
          can&apos;t see who reported them, and reports don&apos;t change a listing&apos;s status
          automatically.
        </p>
      </SettingsCard>

      <p className="px-1 text-[12px] leading-relaxed text-[var(--color-ash-veil)]">
        Profile visibility is controlled from your profile. Blocks and reports are managed from the
        relevant conversation or listing. This page is a summary, not a settings switch.
      </p>
    </div>
  );
}

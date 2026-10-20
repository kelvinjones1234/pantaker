import type { Metadata } from "next";
import { requireSeller } from "@/features/auth/authorization";
import { getAuthUser, getProfile } from "@/features/auth/queries";
import { isPrismaConfigured } from "@/lib/prisma";
import { SellerPageHeader } from "@/components/seller/SellerPageHeader";
import { SettingsCard } from "@/components/seller/SettingsCard";
import { ListingPreferencesForm } from "@/components/seller/ListingPreferencesForm";

export const metadata: Metadata = {
  title: "Listing preferences — Pantaker",
  description: "Defaults Pantaker applies to every new listing you create.",
};

export default async function ListingPreferencesPage() {
  await requireSeller("/seller/settings/listing-preferences");
  const [user, profile] = await Promise.all([getAuthUser(), getProfile()]);

  const isLive = Boolean(user) && isPrismaConfigured();

  return (
    <div className="flex flex-col gap-5">
      <SellerPageHeader
        title="Listing preferences"
        description="Defaults that pre-fill the new-listing form. You can still change them on any individual listing."
      />

      <SettingsCard
        title="Defaults for new listings"
        description="These values are applied when you start a listing at /sell. They never edit a listing that already exists."
      >
        <ListingPreferencesForm
          initial={{
            default_area: profile?.default_area ?? null,
            default_pickup_notes: profile?.default_pickup_notes ?? null,
          }}
          isLive={isLive}
        />
      </SettingsCard>

      <p className="px-1 text-[12px] leading-relaxed text-[var(--color-ash-veil)]">
        Prices, condition, and photos are always chosen per listing — there are
        no safe defaults for them, so they aren&apos;t offered here.
      </p>
    </div>
  );
}

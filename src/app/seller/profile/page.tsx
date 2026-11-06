import type { Metadata } from "next";
import { requireSeller } from "@/features/auth/authorization";
import { getProfile } from "@/features/auth/queries";
import { isPrismaConfigured } from "@/lib/prisma";
import { deliveryUrl, isImageStorageConfigured } from "@/lib/image-storage";
import { SellerPageHeader } from "@/components/seller/SellerPageHeader";
import { ProfileForm } from "@/components/seller/ProfileForm";

export const metadata: Metadata = {
  title: "Profile — Pantaker",
  description: "Manage how you appear to buyers across Pantaker.",
};

export default async function SellerProfilePage() {
  const user = await requireSeller("/seller/profile");
  const profile = await getProfile();

  let avatarUrl: string | undefined;
  if (profile?.avatar_path && isImageStorageConfigured()) {
    try {
      avatarUrl = deliveryUrl(profile.avatar_path);
    } catch {
      avatarUrl = undefined;
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <SellerPageHeader
        title="Profile"
        description="How you appear to buyers across Pantaker. Your display name, username, location, photo, and any contact details you add are shown on your listings."
      />
      <ProfileForm
        initial={{
          display_name: profile?.display_name ?? "",
          username: profile?.username ?? "",
          account_type: profile?.account_type ?? "individual",
          city: profile?.city ?? "",
          area: profile?.area ?? "",
          bio: profile?.bio ?? "",
          phone: profile?.phone ?? "",
          phone_is_whatsapp: profile?.phone_is_whatsapp ?? false,
          instagram_handle: profile?.instagram_handle ?? "",
          x_handle: profile?.x_handle ?? "",
          facebook_handle: profile?.facebook_handle ?? "",
          tiktok_handle: profile?.tiktok_handle ?? "",
          avatarId: profile?.avatar_path ?? undefined,
          avatarUrl,
        }}
        imageUploadsConfigured={isImageStorageConfigured()}
        isLive={Boolean(user) && isPrismaConfigured()}
      />
    </div>
  );
}

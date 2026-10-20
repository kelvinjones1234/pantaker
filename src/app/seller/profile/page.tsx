import type { Metadata } from "next";
import { requireSeller } from "@/features/auth/authorization";
import { getProfile } from "@/features/auth/queries";
import { isPrismaConfigured } from "@/lib/prisma";
import { deliveryUrl, isCloudflareImagesConfigured } from "@/lib/cloudflare-images";
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
  if (profile?.avatar_path && isCloudflareImagesConfigured()) {
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
        description="How you appear to buyers across Pantaker. Only your display name, username, location, bio, and photo are shown."
      />
      <ProfileForm
        initial={{
          display_name: profile?.display_name ?? "",
          username: profile?.username ?? "",
          account_type: profile?.account_type ?? "individual",
          city: profile?.city ?? "",
          area: profile?.area ?? "",
          bio: profile?.bio ?? "",
          avatarId: profile?.avatar_path ?? undefined,
          avatarUrl,
        }}
        imageUploadsConfigured={isCloudflareImagesConfigured()}
        isLive={Boolean(user) && isPrismaConfigured()}
      />
    </div>
  );
}

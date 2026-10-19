import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/supabase/server";
import { getCategories } from "@/features/listings/queries";
import { isCloudflareImagesConfigured } from "@/lib/cloudflare-images";
import { SellClient } from "@/app/sell/SellClient";

export const metadata: Metadata = {
  title: "List an item — Pantaker",
  description: "List scrap, surplus, or usable unwanted items in Abuja.",
};

export default async function SellPage() {
  const user = await getSessionUser().catch(() => null);
  const isSupabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  // Local development (and explicit opt-in) can view and use the form without a
  // session so it can be built/previewed before auth is wired up.
  const allowPreviewAuth =
    process.env.NODE_ENV !== "production" ||
    process.env.NEXT_PUBLIC_PREVIEW_AUTH === "true";

  if (isSupabaseConfigured && !user && !allowPreviewAuth) {
    redirect("/login?next=/sell");
  }

  // Only hit the backend when there's a real session; otherwise the form runs in
  // preview mode (validated client-side, nothing saved).
  const isLive = isSupabaseConfigured && Boolean(user);

  const categories = await getCategories();

  return (
    <SellClient
      categories={categories}
      userEmail={user?.email}
      isLive={isLive}
      imageUploadsConfigured={isCloudflareImagesConfigured()}
    />
  );
}

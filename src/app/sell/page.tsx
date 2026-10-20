import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { getAuthUser, getProfile } from "@/features/auth/queries";
import { isAuthConfigured } from "@/features/auth/authorization";
import { getCategories } from "@/features/listings/queries";
import { isCloudflareImagesConfigured } from "@/lib/cloudflare-images";
import { ListingForm } from "@/components/seller/ListingForm";

export const metadata: Metadata = {
  title: "List an item — Pantaker",
  description: "List scrap, surplus, or usable unwanted items in Abuja.",
};

export default async function SellPage() {
  const user = await getAuthUser().catch(() => null);
  const authConfigured = isAuthConfigured();

  // Local development (and explicit opt-in) can view the form without a session
  // so it can be previewed before auth is wired up. Mutations still require a
  // real session.
  const allowPreviewAuth =
    process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_PREVIEW_AUTH === "true";

  if (authConfigured && !user && !allowPreviewAuth) {
    redirect("/login?next=/sell");
  }

  const isLive = Boolean(user);
  const [categories, profile] = await Promise.all([getCategories(), getProfile()]);

  return (
    <div className="min-h-screen bg-[var(--shop-canvas)] text-[var(--color-ink-black)]">
      <header className="mx-auto flex max-w-[1200px] items-center justify-between px-4 py-5 sm:px-6">
        <Link href="/" aria-label="Pantaker home" className="flex items-center">
          <Logo />
        </Link>
        <Link
          href="/seller/listings"
          className="rounded-full border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] px-3.5 py-1.5 text-xs font-semibold text-[var(--color-ink-black)] transition-colors duration-150 hover:border-[var(--color-ink-30)]"
        >
          Cancel
        </Link>
      </header>

      <main className="mx-auto max-w-2xl px-4 pb-16 pt-2 sm:px-6">
        <div className="mb-6">
          <h1 className="font-brand-serif text-2xl font-bold tracking-tight text-[var(--color-ink-black)] sm:text-3xl">
            List an unwanted item or scrap
          </h1>
          <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-ash-veil)]">
            Connect surplus materials, equipment, and pre-loved items with repairers, makers, and
            buyers across Abuja.
            {!isLive && " You're in preview mode — nothing is saved."}
          </p>
        </div>

        <ListingForm
          mode="create"
          categories={categories}
          isLive={isLive}
          imageUploadsConfigured={isCloudflareImagesConfigured()}
          defaults={{
            area: profile?.default_area ?? null,
            pickup_notes: profile?.default_pickup_notes ?? null,
          }}
        />
      </main>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { requireSeller } from "@/features/auth/authorization";
import {
  getSellerAttention,
  getSellerRecentListings,
  getSellerStats,
  listingCoverUrl,
} from "@/features/listings/seller-queries";
import { SellerPageHeader } from "@/components/seller/SellerPageHeader";
import { SellerMetricCard } from "@/components/seller/SellerMetricCard";
import { SellerEmptyState } from "@/components/seller/SellerEmptyState";
import { SellerStatusPill } from "@/components/seller/SellerStatusPill";
import { StorageImage } from "@/components/ui/storage-image";
import { AlertIcon, ArrowRightIcon, PackageIcon, PlusIcon } from "@/components/brand/icons";
import { pricingLabel, timeAgo } from "@/lib/utils";
import type { Listing } from "@/types/marketplace";

export const metadata: Metadata = {
  title: "Seller Centre — Pantaker",
  description: "Your Pantaker listings, enquiries, and attention items.",
};

const listItemClass =
  "flex items-center gap-3 rounded-[20px] bg-[var(--color-canvas-mist)] p-3 transition-colors duration-150 hover:bg-[var(--color-primary-tint)]";

function RecentListing({ listing }: { listing: Listing }) {
  const cover = listingCoverUrl(listing.listing_images);
  return (
    <Link href="/seller/listings" className={listItemClass}>
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[14px] bg-[var(--color-pure-white)]">
        <StorageImage
          src={cover}
          alt=""
          fill
          sizes="56px"
          className="object-cover"
          fallback={
            <span className="flex h-full items-center justify-center text-[10px] text-[var(--color-muted-gray)]">
              No photo
            </span>
          }
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-[var(--color-ink-black)]">
          {listing.title}
        </p>
        <p className="font-sans tabular mt-0.5 text-[12px] text-[var(--color-muted-gray)]">
          {pricingLabel(listing.pricing_type, listing.price)} · {timeAgo(listing.created_at)}
        </p>
      </div>
      <SellerStatusPill status={listing.item_status} className="shrink-0" />
    </Link>
  );
}

export default async function SellerOverviewPage() {
  await requireSeller("/seller");

  const [stats, recent, attention] = await Promise.all([
    getSellerStats(),
    getSellerRecentListings(5),
    getSellerAttention(5),
  ]);

  const listItemHref = "/seller/listings";

  if (stats.total === 0) {
    return (
      <div className="flex flex-col gap-6">
        <SellerPageHeader
          title="Welcome to your seller workspace"
          description="Track what you're selling, see enquiries, and keep listings healthy."
        />
        <SellerEmptyState
          icon={<PackageIcon className="h-7 w-7 text-[var(--color-shop-violet)]" />}
          heading="You haven't listed anything yet"
          copy="Listings are how buyers find you. Post your first item and it'll show up here with its views, enquiries, and status once it's live."
        >
          <Link
            href="/sell"
            className="inline-flex h-[52px] items-center justify-center gap-2 rounded-full bg-[var(--color-shop-violet)] px-6 text-sm font-semibold text-[var(--color-pure-white)] transition-colors duration-200 hover:bg-[var(--color-primary-hover)]"
          >
            <PlusIcon className="h-4 w-4" />
            List your first item
          </Link>
        </SellerEmptyState>
        <div className="shop-card p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-[var(--color-ink-black)]">Quick listing guide</h2>
          <ul className="mt-3 flex flex-col gap-2 text-[13px] leading-relaxed text-[var(--color-muted-gray)]">
            <li>Add clear photos and an honest description — buyers decide fast.</li>
            <li>Set a realistic price; you can mark it negotiable or free.</li>
            <li>Listings are reviewed before they go live in the marketplace.</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <SellerPageHeader
        title="Overview"
        description="A real-time summary of your listings, enquiries, and anything that needs attention."
      >
        <Link
          href="/sell"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[var(--color-shop-violet)] px-5 text-sm font-semibold text-[var(--color-pure-white)] transition-colors duration-200 hover:bg-[var(--color-primary-hover)]"
        >
          <PlusIcon className="h-4 w-4" />
          List an item
        </Link>
      </SellerPageHeader>

      <section aria-label="Key metrics" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SellerMetricCard label="Total listings" value={stats.total} href={listItemHref} />
        <SellerMetricCard
          label="Active"
          value={stats.published}
          hint="Live in the marketplace"
          href={listItemHref}
        />
        <SellerMetricCard
          label="Buyer enquiries"
          value={stats.enquiries}
          hint="Across your listings"
        />
        <SellerMetricCard label="Items sold" value={stats.sold} hint="Marked as sold by you" href={listItemHref} />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.5fr_1fr]">
        <section className="shop-card p-5 sm:p-6" aria-labelledby="recent-heading">
          <div className="flex items-center justify-between gap-3">
            <h2 id="recent-heading" className="text-sm font-semibold text-[var(--color-ink-black)]">
              Recent listings
            </h2>
            <Link
              href={listItemHref}
              className="text-[12px] font-semibold text-[var(--color-shop-violet)] transition-colors duration-150 hover:text-[var(--color-primary-hover)]"
            >
              Manage all
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="mt-4 text-[13px] text-[var(--color-muted-gray)]">No listings to show yet.</p>
          ) : (
            <div className="mt-4 flex flex-col gap-2">
              {recent.map((listing) => (
                <RecentListing key={listing.id} listing={listing} />
              ))}
            </div>
          )}
        </section>

        <section className="shop-card p-5 sm:p-6" aria-labelledby="attention-heading">
          <h2 id="attention-heading" className="text-sm font-semibold text-[var(--color-ink-black)]">
            Attention required
          </h2>
          {attention.length === 0 ? (
            <p className="mt-4 text-[13px] text-[var(--color-muted-gray)]">
              Nothing needs attention. Your listings look healthy.
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-2">
              {attention.map((item) => (
                <li key={`${item.id}-${item.message}`}>
                  <Link
                    href={item.href}
                    className="flex items-start gap-3 rounded-[20px] bg-[var(--color-canvas-mist)] p-3 transition-colors duration-150 hover:bg-[var(--color-primary-tint)]"
                  >
                    <span
                      className={
                        item.tone === "danger"
                          ? "mt-0.5 text-[var(--color-error)]"
                          : "mt-0.5 text-[var(--color-muted-gray)]"
                      }
                    >
                      <AlertIcon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-semibold text-[var(--color-ink-black)]">
                        {item.title}
                      </span>
                      <span className="block text-[12px] text-[var(--color-muted-gray)]">
                        {item.message}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <p className="flex flex-wrap items-center gap-1.5 text-[12px] text-[var(--color-ash-veil)]">
        Item view tracking isn&apos;t available yet, so no views metric is shown.
        <Link href={listItemHref} className="inline-flex items-center gap-1 font-semibold text-[var(--color-shop-violet)]">
          Review listings
          <ArrowRightIcon className="h-3 w-3" />
        </Link>
      </p>
    </div>
  );
}

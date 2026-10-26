import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClockIcon, MapPinIcon } from "@/components/brand/icons";
import { ConditionBadge } from "@/components/ui/badge";
import { ListingCard } from "@/components/marketplace/ListingCard";
import { ListingGallery } from "@/components/marketplace/ListingGallery";
import { ListingQuickNav } from "@/components/marketplace/ListingQuickNav";
import {
  getListingDetail,
  getRelatedListings,
} from "@/features/listings/queries";
import { getAuthUser } from "@/features/auth/queries";
import { isAuthConfigured } from "@/features/auth/authorization";
import {
  formatLongDate,
  formatQuantity,
  pricingLabel,
  timeAgo,
} from "@/lib/utils";
import { StartConversationForm } from "@/components/messaging/StartConversationForm";
import { CONDITION_LABELS } from "@/types/marketplace";
import { ReportListingForm } from "@/components/messaging/ReportListingForm";
import { ParticipantAvatar } from "@/components/messaging/ParticipantAvatar";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const listing = await getListingDetail(id);
  if (!listing) return { title: "Listing not found — Pantaker" };

  const description =
    listing.description?.slice(0, 160) ??
    `${listing.title} in ${listing.area ?? listing.city}. View details and contact the seller on Pantaker.`;
  const image = listing.images[0]?.url;

  return {
    title: `${listing.title} — Pantaker`,
    description,
    openGraph: {
      title: listing.title,
      description,
      images: image ? [{ url: image }] : [],
    },
  };
}

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [listing, user] = await Promise.all([
    getListingDetail(id),
    getAuthUser(),
  ]);
  if (!listing) notFound();

  const related = await getRelatedListings({
    sellerId: listing.seller_id || null,
    categorySlug: listing.category?.slug ?? null,
    excludeId: listing.id,
  });

  const isOwner = Boolean(
    user && listing.seller_id && user.id === listing.seller_id,
  );
  const sellerName =
    listing.seller?.display_name ??
    (listing.seller?.username ? `@${listing.seller.username}` : "the seller");
  const canContact = listing.item_status === "published" && !isOwner;
  const quantity = formatQuantity(listing.quantity, listing.quantity_unit);
  const listedDate = formatLongDate(listing.published_at ?? listing.created_at);
  const hasRelated = related.seller.length > 0 || related.similar.length > 0;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-28 pt-8 sm:px-6 md:pb-8 md:pl-24">
      <ListingQuickNav user={user} category={listing.category} />

      <nav
        aria-label="Breadcrumb"
        className="flex flex-wrap items-center gap-1.5 text-[12px] text-[var(--color-ash-veil)]"
      >
        <Link
          href="/marketplace"
          className="font-semibold text-[var(--color-shop-violet)] transition-colors duration-150 hover:text-[var(--color-primary-hover)]"
        >
          Marketplace
        </Link>
        <span aria-hidden="true">/</span>
        {listing.category ? (
          <Link
            href={`/marketplace/${listing.category.slug}`}
            className="transition-colors duration-150 hover:text-[var(--color-ink-black)]"
          >
            {listing.category.name}
          </Link>
        ) : (
          <span>Recoverable item</span>
        )}
      </nav>

      {listing.sample && (
        <p className="mt-4 text-[12px] leading-relaxed text-[var(--color-muted-gray)]">
          Sample listing shown in local preview — connect the database to see
          real listings and messaging.
        </p>
      )}

      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex flex-col gap-5">
          <ListingGallery images={listing.images} title={listing.title} />

          <article className="shop-card p-5 sm:p-6">
            <p className="text-[12px] font-medium text-[var(--color-muted-gray)]">
              {listing.category?.name ?? "Recoverable item"}
            </p>
            <h1 className="mt-1 font-brand-serif text-2xl font-bold tracking-tight text-[var(--color-ink-black)] sm:text-3xl">
              {listing.title}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-2.5">
              <span className="font-sans tabular text-[22px] font-semibold tracking-tight text-[var(--color-ink-black)]">
                {pricingLabel(listing.pricing_type, listing.price)}
              </span>
              <ConditionBadge value={listing.condition} />
              {listing.negotiable && listing.pricing_type !== "offer" && (
                <span className="rounded-full bg-[var(--color-canvas-mist)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-ink-black)]">
                  Negotiable
                </span>
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-[var(--color-muted-gray)]">
              <span className="flex items-center gap-1">
                <MapPinIcon className="h-3.5 w-3.5" aria-hidden="true" />
                {listing.area ? `${listing.area}, Abuja` : listing.city}
              </span>
              <span className="flex items-center gap-1">
                <ClockIcon className="h-3.5 w-3.5" aria-hidden="true" />
                Listed {timeAgo(listing.published_at ?? listing.created_at)}
              </span>
            </div>

            {listing.description && (
              <div className="mt-5">
                <h2 className="text-[13px] font-semibold text-[var(--color-ink-black)]">
                  Description
                </h2>
                <p className="mt-2 max-w-[70ch] whitespace-pre-line text-[13px] leading-relaxed text-[var(--color-ash-veil)]">
                  {listing.description}
                </p>
              </div>
            )}

            <div className="mt-5">
              <h2 className="text-[13px] font-semibold text-[var(--color-ink-black)]">
                Item details
              </h2>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-[13px]">
                <div>
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted-gray)]">
                    Condition
                  </dt>
                  <dd className="mt-0.5 text-[var(--color-ink-black)]">
                    {CONDITION_LABELS[listing.condition]}
                  </dd>
                </div>
                {quantity && (
                  <div>
                    <dt className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted-gray)]">
                      Quantity
                    </dt>
                    <dd className="mt-0.5 text-[var(--color-ink-black)]">
                      {quantity}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted-gray)]">
                    Category
                  </dt>
                  <dd className="mt-0.5">
                    {listing.category ? (
                      <Link
                        href={`/marketplace/${listing.category.slug}`}
                        className="text-[var(--color-ink-black)] underline decoration-[var(--color-faint-border)] underline-offset-2 transition-colors duration-150 hover:text-[var(--color-shop-violet)]"
                      >
                        {listing.category.name}
                      </Link>
                    ) : (
                      <span className="text-[var(--color-ink-black)]">
                        Recoverable item
                      </span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted-gray)]">
                    Listed
                  </dt>
                  <dd className="mt-0.5 text-[var(--color-ink-black)]">
                    {listedDate}
                  </dd>
                </div>
              </dl>
            </div>

            {listing.pickup_notes && (
              <div className="mt-5">
                <h2 className="text-[13px] font-semibold text-[var(--color-ink-black)]">
                  Collection
                </h2>
                <p className="mt-2 max-w-[70ch] text-[13px] leading-relaxed text-[var(--color-ash-veil)]">
                  {listing.pickup_notes}
                </p>
              </div>
            )}
          </article>
        </div>

        <div className="flex flex-col gap-5">
          <aside className="shop-card p-5" aria-label="Seller">
            <div className="flex items-center gap-3">
              <ParticipantAvatar
                name={sellerName}
                avatarPath={listing.seller?.avatar_path}
              />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-muted-gray)]">
                  Seller
                </p>
                <p className="truncate text-[14px] font-semibold text-[var(--color-ink-black)]">
                  {sellerName}
                </p>
                {listing.seller && (
                  <p className="mt-0.5 text-[12px] text-[var(--color-muted-gray)]">
                    {listing.seller.account_type === "business"
                      ? "Business seller"
                      : "Individual seller"}
                    {listing.seller.city
                      ? ` · ${listing.seller.city}`
                      : ""}
                  </p>
                )}
              </div>
            </div>

            {listing.seller?.bio && (
              <p className="mt-4 max-w-[70ch] whitespace-pre-line text-[12px] leading-relaxed text-[var(--color-ash-veil)]">
                {listing.seller.bio}
              </p>
            )}

            {listing.seller && (
              <p className="mt-3 text-[12px] text-[var(--color-muted-gray)]">
                Member since {formatLongDate(listing.seller.created_at)}
              </p>
            )}

            <div className="mt-5">
              {isOwner ? (
                <div className="flex flex-col gap-2">
                  <p className="text-[12px] text-[var(--color-ash-veil)]">
                    This is your listing.
                  </p>
                  <Link
                    href={`/seller/listings/${listing.id}/edit`}
                    className="inline-flex h-11 items-center justify-center rounded-full bg-[var(--color-shop-violet)] px-5 text-sm font-semibold text-[var(--color-pure-white)] transition-colors duration-200 hover:bg-[var(--color-primary-hover)]"
                  >
                    Manage listing
                  </Link>
                </div>
              ) : canContact ? (
                user ? (
                  <StartConversationForm
                    listingId={listing.id}
                    sellerName={sellerName}
                    isLive={isAuthConfigured()}
                  />
                ) : (
                  <div className="flex flex-col gap-3">
                    <p className="text-[12px] leading-relaxed text-[var(--color-ash-veil)]">
                      Sign in to message the seller. Your conversation is kept
                      on your Pantaker account, not in this browser.
                    </p>
                    <Link
                      href={`/login?next=/marketplace/listing/${listing.id}`}
                      className="inline-flex h-11 items-center justify-center rounded-full bg-[var(--color-shop-violet)] px-5 text-sm font-semibold text-[var(--color-pure-white)] transition-colors duration-200 hover:bg-[var(--color-primary-hover)]"
                    >
                      Sign in to message
                    </Link>
                  </div>
                )
              ) : (
                <p className="text-[12px] leading-relaxed text-[var(--color-ash-veil)]">
                  This listing is no longer available for enquiries.
                </p>
              )}
            </div>
          </aside>

          <div className="shop-card p-5">
            <ReportListingForm
              listingId={listing.id}
              isLive={isAuthConfigured()}
            />
          </div>
        </div>
      </div>

      {hasRelated && (
        <div className="mt-12 flex flex-col gap-10">
          {related.seller.length > 0 && (
            <section aria-labelledby="seller-listings-heading">
              <div className="mb-4 flex items-end justify-between gap-4">
                <h2
                  id="seller-listings-heading"
                  className="font-brand-serif text-xl font-bold tracking-tight text-[var(--color-ink-black)]"
                >
                  More from this seller
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {related.seller.map((item) => (
                  <ListingCard key={item.id} listing={item} />
                ))}
              </div>
            </section>
          )}

          {related.similar.length > 0 && (
            <section aria-labelledby="similar-listings-heading">
              <div className="mb-4 flex items-end justify-between gap-4">
                <h2
                  id="similar-listings-heading"
                  className="font-brand-serif text-xl font-bold tracking-tight text-[var(--color-ink-black)]"
                >
                  Similar finds
                </h2>
                {listing.category && (
                  <Link
                    href={`/marketplace/${listing.category.slug}`}
                    className="shrink-0 text-[12px] font-semibold text-[var(--color-shop-violet)] transition-colors duration-150 hover:text-[var(--color-primary-hover)]"
                  >
                    Browse {listing.category.name}
                  </Link>
                )}
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {related.similar.map((item) => (
                  <ListingCard key={item.id} listing={item} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

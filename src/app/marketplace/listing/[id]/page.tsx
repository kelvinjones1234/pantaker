import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPinIcon } from "@/components/brand/icons";
import { ConditionBadge } from "@/components/ui/badge";
import { getListingDetail } from "@/features/listings/queries";
import { getAuthUser } from "@/features/auth/queries";
import { isAuthConfigured } from "@/features/auth/authorization";
import { pricingLabel, timeAgo } from "@/lib/utils";
import { StartConversationForm } from "@/components/messaging/StartConversationForm";
import { ReportListingForm } from "@/components/messaging/ReportListingForm";
import { ParticipantAvatar } from "@/components/messaging/ParticipantAvatar";
import { StorageImage } from "@/components/ui/storage-image";

export const metadata: Metadata = { title: "Listing — Pantaker" };

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

  const isOwner = Boolean(
    user && listing.seller_id && user.id === listing.seller_id,
  );
  const sellerName =
    listing.seller?.display_name ??
    (listing.seller?.username ? `@${listing.seller.username}` : "the seller");
  const canContact = listing.item_status === "published" && !isOwner;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <Link
        href="/marketplace"
        className="text-[12px] font-semibold text-[var(--color-shop-violet)] transition-colors duration-150 hover:text-[var(--color-primary-hover)]"
      >
        ← Back to marketplace
      </Link>

      {listing.sample && (
        <p className="mt-4 rounded-[16px] bg-[var(--color-primary-tint)] px-4 py-2.5 text-[12px] text-[var(--color-ink-black)]">
          Sample listing shown in local preview — connect the database to see
          real listings and messaging.
        </p>
      )}

      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex flex-col gap-5">
          <div className="shop-card overflow-hidden p-2.5">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[20px] bg-[var(--color-canvas-mist)]">
              <StorageImage
                src={listing.images[0]}
                alt={listing.title}
                fill
                sizes="(max-width: 1024px) 100vw, 640px"
                className="object-cover"
                priority
                fallback={
                  <span className="flex h-full items-center justify-center text-[13px] text-[var(--color-muted-gray)]">
                    No photo provided
                  </span>
                }
              />
            </div>
          </div>

          <div className="shop-card p-5 sm:p-6">
            <p className="text-[12px] font-medium text-[var(--color-muted-gray)]">
              {listing.category?.name ?? "Recoverable item"}
            </p>
            <h1 className="mt-1 font-brand-serif text-2xl font-bold tracking-tight text-[var(--color-ink-black)]">
              {listing.title}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="font-sans tabular text-[18px] font-semibold tracking-tight text-[var(--color-ink-black)]">
                {pricingLabel(listing.pricing_type, listing.price)}
              </span>
              <ConditionBadge value={listing.condition} />
            </div>
            <p className="mt-3 flex items-center gap-1 text-[12px] text-[var(--color-muted-gray)]">
              <MapPinIcon className="h-3.5 w-3.5" aria-hidden="true" />
              {listing.area ? `${listing.area}, Abuja` : listing.city} · Listed{" "}
              {timeAgo(listing.created_at)}
            </p>

            {listing.description && (
              <div className="mt-5">
                <h2 className="text-[13px] font-semibold text-[var(--color-ink-black)]">
                  Description
                </h2>
                <p className="mt-2 whitespace-pre-line text-[13px] leading-relaxed text-[var(--color-ash-veil)]">
                  {listing.description}
                </p>
              </div>
            )}

            {listing.pickup_notes && (
              <div className="mt-5">
                <h2 className="text-[13px] font-semibold text-[var(--color-ink-black)]">
                  Collection
                </h2>
                <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-ash-veil)]">
                  {listing.pickup_notes}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="shop-card p-5">
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
              </div>
            </div>

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
          </div>

          <div className="shop-card p-5">
            <ReportListingForm
              listingId={listing.id}
              isLive={isAuthConfigured()}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

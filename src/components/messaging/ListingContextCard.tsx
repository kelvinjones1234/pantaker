import Link from "next/link";
import { SellerStatusPill } from "@/components/seller/SellerStatusPill";
import type { ConversationListingRef } from "@/types/marketplace";

/**
 * The listing a conversation is about, with its live availability. The listing
 * can be read by both parties even after it is no longer public (see the RLS
 * policy in 0003_messaging.sql), so this always reflects the true state.
 */
export function ListingContextCard({
  listing,
  className,
}: {
  listing: ConversationListingRef | null;
  className?: string;
}) {
  if (!listing) {
    return (
      <div className={className}>
        <p className="text-[12px] text-[var(--color-muted-gray)]">
          This listing is no longer available to show.
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-muted-gray)]">
        About this listing
      </p>
      <Link
        href={`/marketplace/listing/${listing.id}`}
        className="mt-2 flex items-start justify-between gap-3 transition-colors duration-150 hover:text-[var(--color-shop-violet)]"
      >
        <span className="line-clamp-2 text-[13px] font-semibold text-[var(--color-ink-black)]">
          {listing.title}
        </span>
      </Link>
      <div className="mt-2 flex items-center gap-2">
        <SellerStatusPill status={listing.item_status} />
        <Link
          href={`/marketplace/listing/${listing.id}`}
          className="text-[12px] font-semibold text-[var(--color-shop-violet)] transition-colors duration-150 hover:text-[var(--color-primary-hover)]"
        >
          Open listing
        </Link>
      </div>
    </div>
  );
}

import Image from "next/image";
import Link from "next/link";
import { MapPinIcon } from "@/components/brand/icons";
import { ConditionBadge } from "@/components/ui/badge";
import { pricingLabel, timeAgo } from "@/lib/utils";
import type { Condition } from "@/types/marketplace";

export interface CardListing {
  id: string;
  title: string;
  condition: Condition;
  pricing_type: string;
  price: number | null;
  city: string;
  area?: string | null;
  category?: string;
  group?: string;
  image?: string;
  created_at: string;
}

/**
 * Cards open the listing detail page, where a buyer can message the seller or
 * report the listing. Reused by the browse page in grid and list layouts.
 */
function listingHref(listing: CardListing): string {
  return `/marketplace/listing/${listing.id}`;
}

function LocationLine({ listing }: { listing: CardListing }) {
  return (
    <p className="mt-1 flex items-center gap-1 text-[11px] text-[var(--color-muted-gray)]">
      <MapPinIcon className="h-3 w-3" aria-hidden="true" />
      {listing.area ? `${listing.area}, Abuja` : listing.city} · {timeAgo(listing.created_at)}
    </p>
  );
}

export function ListingCard({
  listing,
  variant = "grid",
}: {
  listing: CardListing;
  variant?: "grid" | "list";
}) {
  if (variant === "list") {
    return (
      <Link
        href={listingHref(listing)}
        className="shop-card group flex cursor-pointer items-stretch gap-3 p-2.5 transition-all hover:-translate-y-0.5"
      >
        <div className="relative aspect-square w-28 shrink-0 overflow-hidden rounded-[20px] bg-[var(--color-canvas-mist)] sm:w-36">
          {listing.image ? (
            <Image
              src={listing.image}
              alt={listing.title}
              fill
              sizes="(max-width: 640px) 112px, 144px"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <span className="flex h-full items-center justify-center p-2 text-center text-[11px] text-[var(--color-muted-gray)]">
              No photo
            </span>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center py-1 pr-1.5">
          <p className="truncate text-xs font-medium text-[var(--color-muted-gray)]">
            {listing.category ?? "Recoverable item"}
          </p>
          <h3 className="mt-1 line-clamp-2 text-[13px] font-semibold text-[var(--color-ink-black)] sm:text-sm">
            {listing.title}
          </h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className="font-sans tabular text-[14px] font-semibold tracking-tight text-[var(--color-ink-black)]">
              {pricingLabel(listing.pricing_type, listing.price)}
            </span>
            <ConditionBadge value={listing.condition} />
          </div>
          <LocationLine listing={listing} />
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={listingHref(listing)}
      className="shop-card group flex cursor-pointer flex-col p-2.5 transition-all hover:-translate-y-0.5"
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-[20px] bg-[var(--color-canvas-mist)]">
        {listing.image ? (
          <Image
            src={listing.image}
            alt={listing.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center p-4 text-center text-xs text-[var(--color-muted-gray)]">
            No photo provided
          </div>
        )}
        <div className="absolute left-2 top-2">
          <ConditionBadge value={listing.condition} className="bg-[var(--overlay-paper-95)]" />
        </div>
      </div>
      <div className="px-1.5 pb-1 pt-2.5">
        <p className="truncate text-xs font-medium text-[var(--color-muted-gray)]">
          {listing.category ?? "Recoverable item"}
        </p>
        <h3 className="mt-1 line-clamp-2 text-[13px] font-semibold text-[var(--color-ink-black)]">
          {listing.title}
        </h3>
        <p className="font-sans tabular mt-1.5 text-[14px] font-semibold tracking-tight text-[var(--color-ink-black)]">
          {pricingLabel(listing.pricing_type, listing.price)}
        </p>
        <LocationLine listing={listing} />
      </div>
    </Link>
  );
}

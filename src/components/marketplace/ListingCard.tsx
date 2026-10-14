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
  image?: string;
  created_at: string;
}

export function ListingCard({ listing }: { listing: CardListing }) {
  return (
    <Link
      href={`/marketplace/${listing.id}`}
      className="card group overflow-hidden transition hover:-translate-y-0.5 hover:shadow-pop"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-[#E4DDCF]">
        {listing.image ? (
          <Image
            src={listing.image}
            alt={listing.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition duration-300 group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-[#69736D]">
            No photo
          </div>
        )}
        <div className="absolute left-2 top-2">
          <ConditionBadge value={listing.condition} className="bg-white/95" />
        </div>
      </div>
      <div className="p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#69736D]">
          {listing.category ?? "Recoverable item"} · {timeAgo(listing.created_at)}
        </p>
        <h3 className="mt-1 line-clamp-2 text-sm font-semibold leading-snug text-[#202723] group-hover:text-[#174D3B]">
          {listing.title}
        </h3>
        <p className="mt-2 text-base font-extrabold text-[#174D3B]">
          {pricingLabel(listing.pricing_type, listing.price)}
        </p>
        <p className="mt-1 flex items-center gap-1 text-xs text-[#69736D]">
          <MapPinIcon className="h-3.5 w-3.5" />
          {listing.area ? `${listing.area}, ${listing.city}` : listing.city}
        </p>
      </div>
    </Link>
  );
}

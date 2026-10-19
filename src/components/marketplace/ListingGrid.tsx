import { ListingCard, type CardListing } from "@/components/marketplace/ListingCard";
import type { BrowseView } from "@/components/marketplace/browse-state";

function SkeletonCard() {
  return (
    <div className="shop-card flex flex-col p-2.5">
      <div className="aspect-square w-full animate-pulse rounded-[20px] bg-[var(--color-canvas-mist)]" />
      <div className="px-1.5 pb-1 pt-3">
        <div className="h-3 w-1/3 animate-pulse rounded-full bg-[var(--color-canvas-mist)]" />
        <div className="mt-2 h-3.5 w-4/5 animate-pulse rounded-full bg-[var(--color-canvas-mist)]" />
        <div className="mt-2 h-3.5 w-1/3 animate-pulse rounded-full bg-[var(--color-canvas-mist)]" />
      </div>
    </div>
  );
}

export function ListingGrid({
  items,
  view,
  pending = false,
}: {
  items: CardListing[];
  view: BrowseView;
  pending?: boolean;
}) {
  if (pending) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <SkeletonCard key={index} />
        ))}
      </div>
    );
  }

  if (view === "list") {
    return (
      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <ListingCard key={item.id} listing={item} variant="list" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((item) => (
        <ListingCard key={item.id} listing={item} />
      ))}
    </div>
  );
}

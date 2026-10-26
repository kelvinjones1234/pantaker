import { ListingCard, type CardListing } from "@/components/marketplace/ListingCard";
import type { BrowseView } from "@/components/marketplace/browse-state";
import { ProductCardSkeleton } from "@/components/ui/page-skeletons";

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
    if (view === "list") {
      return (
        <div
          className="flex flex-col gap-3"
          role="status"
          aria-busy="true"
          aria-live="polite"
        >
          <span className="sr-only">Loading listings</span>
          {Array.from({ length: 5 }).map((_, index) => (
            <ProductCardSkeleton key={index} variant="list" />
          ))}
        </div>
      );
    }

    return (
      <div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        role="status"
        aria-busy="true"
        aria-live="polite"
      >
        <span className="sr-only">Loading listings</span>
        {Array.from({ length: 8 }).map((_, index) => (
          <ProductCardSkeleton key={index} />
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

import type { Metadata } from "next";
import { ListingsBrowser } from "@/components/marketplace/ListingsBrowser";
import { loadBrowse, type RawSearchParams } from "@/features/listings/browse";

export const metadata: Metadata = {
  title: "Browse recoverable items in Abuja",
  description:
    "Browse scrap, spare parts, and reusable goods from people and businesses around Abuja on Pantaker.",
};

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const raw = await searchParams;
  const data = await loadBrowse("", raw);

  return (
    <ListingsBrowser
      items={data.items}
      total={data.total}
      pageSize={data.pageSize}
      isLive={data.live}
      categories={data.categories}
      activeSlug={data.activeSlug}
      groups={data.groups}
      state={data.state}
      heading={data.heading}
      description={data.description}
    />
  );
}

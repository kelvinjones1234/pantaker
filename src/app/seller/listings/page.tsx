import type { Metadata } from "next";
import { requireSeller } from "@/features/auth/authorization";
import { getCategories } from "@/features/listings/queries";
import { getSellerListingsPage, listingCoverUrl } from "@/features/listings/seller-queries";
import { sellerListingFilterSchema } from "@/lib/validation/listings";
import { SellerPageHeader } from "@/components/seller/SellerPageHeader";
import {
  SellerListingsBrowser,
  type SellerListingView,
} from "@/components/seller/SellerListingsBrowser";

export const metadata: Metadata = {
  title: "My Listings — Pantaker",
  description: "Search, filter, and manage your Pantaker listings.",
};

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SellerListingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireSeller("/seller/listings");

  const raw = await searchParams;
  // URL params are validated before use — unknown/invalid values fall back to
  // safe defaults instead of reaching the query.
  const filters = sellerListingFilterSchema.parse({
    q: one(raw.q),
    status: one(raw.status),
    category: one(raw.category),
    sort: one(raw.sort),
    page: one(raw.page),
  });

  const [data, categories] = await Promise.all([
    getSellerListingsPage(filters),
    getCategories(),
  ]);

  const views: SellerListingView[] = data.items.map((listing) => ({
    id: listing.id,
    title: listing.title,
    category: listing.categories?.name ?? null,
    pricing_type: listing.pricing_type,
    price: listing.price,
    status: listing.item_status,
    created_at: listing.created_at,
    updated_at: listing.updated_at,
    image: listingCoverUrl(listing.listing_images),
    // Published listings open their own public detail page. It did not exist
    // when this link was first written (it pointed at the category page).
    publicHref: listing.item_status === "published" ? `/marketplace/listing/${listing.id}` : undefined,
  }));

  const categoryOptions = categories
    .map((category) => ({ id: category.id ?? "", name: category.name }))
    .filter((category) => category.id);

  return (
    <div className="flex flex-col gap-6">
      <SellerPageHeader
        title="My Listings"
        description="Everything you're selling in one place. Search, filter by status or category, and manage each listing."
      />
      <SellerListingsBrowser
        items={views}
        total={data.total}
        page={data.page}
        pageSize={data.pageSize}
        filters={{
          q: filters.q,
          status: filters.status,
          category: filters.category,
          sort: filters.sort,
        }}
        categories={categoryOptions}
      />
    </div>
  );
}

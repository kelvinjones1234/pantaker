import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireSeller } from "@/features/auth/authorization";
import { getCategories } from "@/features/listings/queries";
import { getSellerListing } from "@/features/listings/seller-queries";
import { canEdit } from "@/features/listings/lifecycle";
import { deliveryUrl, isImageStorageConfigured } from "@/lib/image-storage";
import { SellerPageHeader } from "@/components/seller/SellerPageHeader";
import { ListingForm } from "@/components/seller/ListingForm";

export const metadata: Metadata = {
  title: "Edit listing — Pantaker",
};

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSeller("/seller/listings");

  const { id } = await params;
  // getSellerListing is scoped to the session, so another seller's id resolves
  // to null and 404s — the id in the URL is never trusted.
  const listing = await getSellerListing(id);
  if (!listing) notFound();
  if (!canEdit(listing.item_status)) redirect("/seller/listings");

  const categories = await getCategories();

  const images = (listing.listing_images ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .flatMap((image) => {
      if (!isImageStorageConfigured() || !image.storage_path) return [];
      try {
        return [{ id: image.storage_path, url: deliveryUrl(image.storage_path), name: image.alt_text ?? listing.title }];
      } catch {
        return [];
      }
    });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <SellerPageHeader
        title="Edit listing"
        description="Update the details, price, photos, or collection info. Editing a live listing sends it back to review."
      />
      <ListingForm
        mode="edit"
        listingId={listing.id}
        categories={categories}
        isLive
        imageUploadsConfigured={isImageStorageConfigured()}
        initial={{
          title: listing.title,
          description: listing.description,
          category_id: listing.category_id,
          condition: listing.condition,
          pricing_type: listing.pricing_type,
          price: listing.price,
          quantity: listing.quantity,
          quantity_unit: listing.quantity_unit,
          area: listing.area,
          pickup_notes: listing.pickup_notes,
          images,
        }}
      />
    </div>
  );
}

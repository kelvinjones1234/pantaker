"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  createListingSchema,
  inquirySchema,
  listingImageIdsSchema,
  reportSchema,
} from "@/lib/validation/listings";
import { uploadLimits } from "@/config/site";

function isConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/** Create a listing as the authenticated seller. Identity is derived from the session. */
export async function createListingAction(formData: FormData) {
  if (!isConfigured()) {
    return {
      ok: false as const,
      errors: { _form: ["Listing submission needs Supabase configuration. See README to connect a project."] },
    };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/sell");

  const parsed = createListingSchema.safeParse({
    title: formData.get("title"),
    category_id: formData.get("category_id"),
    description: formData.get("description"),
    // Seller picks the condition; default to scrap if omitted.
    condition: formData.get("condition") || "scrap",
    pricing_type: formData.get("pricing_type"),
    price: formData.get("price") || null,
    negotiable: formData.get("negotiable") === "on",
    quantity: formData.get("quantity") || null,
    quantity_unit: formData.get("quantity_unit") || null,
    city: formData.get("city"),
    area: formData.get("area") || null,
    pickup_notes: formData.get("pickup_notes") || null,
  });

  if (!parsed.success) {
    return { ok: false as const, errors: parsed.error.flatten().fieldErrors };
  }

  // Photos are uploaded straight to Cloudflare from the browser; here we only
  // receive the ordered list of image ids (first is the cover).
  let imageIds: string[] = [];
  const rawImageIds = formData.get("image_ids");
  if (typeof rawImageIds === "string" && rawImageIds.trim()) {
    let decoded: unknown;
    try {
      decoded = JSON.parse(rawImageIds);
    } catch {
      return { ok: false as const, errors: { _form: ["We could not read the uploaded photos. Please re-add them."] } };
    }
    const imagesParsed = listingImageIdsSchema.safeParse(decoded);
    if (!imagesParsed.success) {
      return {
        ok: false as const,
        errors: { image_ids: imagesParsed.error.issues.map((issue) => issue.message) },
      };
    }
    imageIds = imagesParsed.data;
  }

  const slugBase = parsed.data.title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);

  const { data, error } = await supabase
    .from("listings")
    .insert({
      seller_id: user.id, // never trust client-submitted seller ids
      slug: `${slugBase}-${Date.now().toString(36)}`,
      item_status: "pending_review",
      ...parsed.data,
      price: parsed.data.pricing_type === "free" ? null : (parsed.data.price ?? null),
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false as const, errors: { _form: ["Could not save listing. Try again."] } };

  const listingId = (data as { id: string }).id;

  // Persist image rows. If this fails, roll the listing back so we never leave
  // a listing without its photos.
  if (imageIds.length > 0) {
    const { error: imageError } = await supabase.from("listing_images").insert(
      imageIds.map((storagePath, index) => ({
        listing_id: listingId,
        storage_path: storagePath,
        sort_order: index,
        alt_text: parsed.data.title,
      })),
    );

    if (imageError) {
      await supabase.from("listings").delete().eq("id", listingId).eq("seller_id", user.id);
      return {
        ok: false as const,
        errors: { _form: ["We couldn't attach your photos, so nothing was posted. Please try again."] },
      };
    }
  }

  return { ok: true as const, id: listingId };
}

export async function sendInquiryAction(listingId: string, sellerId: string, message: string) {
  const parsed = inquirySchema.safeParse({ listing_id: listingId, message });
  if (!parsed.success) return { ok: false as const, error: "Please write a short message." };
  if (!isConfigured()) {
    return { ok: false as const, error: "Inquiries need Supabase configuration. See README to connect a project." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (user.id === sellerId) return { ok: false as const, error: "You cannot inquire on your own listing." };

  const { error } = await supabase.from("inquiries").insert({
    listing_id: listingId,
    buyer_id: user.id,
    seller_id: sellerId,
    message: parsed.data.message,
  });
  if (error) return { ok: false as const, error: "Could not send inquiry. The listing may no longer be available." };
  return { ok: true as const };
}

export async function reportListingAction(listingId: string, reason: string, details: string) {
  const parsed = reportSchema.safeParse({ listing_id: listingId, reason, details });
  if (!parsed.success) return { ok: false as const, error: "Please complete the report form." };
  if (!isConfigured()) {
    return { ok: false as const, error: "Reports need Supabase configuration. See README to connect a project." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    listing_id: listingId,
    reason: parsed.data.reason,
    details: parsed.data.details,
  });
  if (error) return { ok: false as const, error: "Could not submit report. Try again." };
  return { ok: true as const };
}

export { uploadLimits };

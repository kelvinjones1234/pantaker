"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createListingSchema, inquirySchema, reportSchema } from "@/lib/validation/listings";
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
    condition: formData.get("condition"),
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

  // Image uploads are handled client-side to the seller's own storage prefix
  // with server validation of type/size; metadata rows reference listing.
  return { ok: true as const, id: (data as { id: string }).id };
}

export async function toggleFavoriteAction(listingId: string) {
  // Landing-only app: without a backend the save is a session-local shortlist.
  // With Supabase configured this persists to the user's favorites.
  if (!isConfigured()) return { saved: true };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: existing } = await supabase
    .from("favorites")
    .select("id")
    .eq("user_id", user.id)
    .eq("listing_id", listingId)
    .maybeSingle();

  if (existing) {
    await supabase.from("favorites").delete().eq("id", (existing as { id: string }).id);
    return { saved: false };
  }
  const { error } = await supabase.from("favorites").insert({ user_id: user.id, listing_id: listingId });
  if (error) throw new Error("Could not save listing.");
  return { saved: true };
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

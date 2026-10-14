import { createClient } from "@/lib/supabase/server";
import { SAMPLE_CATEGORIES, SAMPLE_LISTINGS } from "@/lib/sample-data";
import type { MarketplaceFilters } from "@/lib/validation/listings";
import type { CardListing } from "@/components/marketplace/ListingCard";
import { paginationDefaults } from "@/config/site";

/** Resolve a category slug to its display name (sample data). */
function sampleCategoryName(slug: string): string | null {
  const found = SAMPLE_CATEGORIES.find((c) => c.slug.toLowerCase() === slug.toLowerCase());
  return found ? (found.name as string) : null;
}

function sampleToCards(filters: MarketplaceFilters): { items: CardListing[]; total: number } {
  let items = SAMPLE_LISTINGS.map((s) => ({
    id: s.id,
    title: s.title,
    condition: s.condition,
    pricing_type: s.pricing_type,
    price: s.price,
    city: s.city,
    area: s.area,
    category: s.category,
    image: s.image,
    created_at: s.created_at,
  }));
  if (filters.q) {
    const q = filters.q.toLowerCase();
    items = items.filter((i) => i.title.toLowerCase().includes(q));
  }
  if (filters.condition) items = items.filter((i) => i.condition === filters.condition);
  if (filters.category) {
    const name = sampleCategoryName(filters.category);
    items = items.filter((i) =>
      name
        ? i.category?.toLowerCase() === name.toLowerCase()
        : i.category?.toLowerCase() === filters.category.toLowerCase(),
    );
  }
  if (filters.minPrice != null) items = items.filter((i) => (i.price ?? 0) >= filters.minPrice!);
  if (filters.maxPrice != null) items = items.filter((i) => (i.price ?? Infinity) <= filters.maxPrice!);
  if (filters.sort === "price_asc") items.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
  else if (filters.sort === "price_desc") items.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
  return { items, total: items.length };
}

export async function searchListings(filters: MarketplaceFilters): Promise<{
  items: CardListing[];
  total: number;
  live: boolean;
}> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { ...sampleToCards(filters), live: false };
  }
  const supabase = await createClient();
  const pageSize = paginationDefaults.marketplacePageSize;
  const from = (filters.page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("listings")
    .select(
      filters.category
        ? "id,title,condition,pricing_type,price,city,area,created_at,categories!inner(name,slug),listing_images(storage_path,sort_order)"
        : "id,title,condition,pricing_type,price,city,area,created_at,categories(name,slug),listing_images(storage_path,sort_order)",
      { count: "exact" },
    )
    .eq("item_status", "published")
    .order(filters.sort === "price_asc" || filters.sort === "price_desc" ? "price" : "published_at", {
      ascending: filters.sort === "price_asc",
      nullsFirst: false,
    })
    .range(from, to);

  if (filters.q) query = query.textSearch("title", filters.q, { type: "websearch" });
  if (filters.category) query = query.eq("categories.slug", filters.category.toLowerCase());
  if (filters.condition) query = query.eq("condition", filters.condition);
  if (filters.city) query = query.ilike("city", `%${filters.city}%`);
  if (filters.minPrice != null) query = query.gte("price", filters.minPrice);
  if (filters.maxPrice != null) query = query.lte("price", filters.maxPrice);

  const { data, count } = await query;
  if (!data) return { items: [], total: 0, live: true };

  return {
    live: true,
    total: count ?? data.length,
    items: data.map((row: Record<string, unknown>) => ({
      id: row["id"] as string,
      title: row["title"] as string,
      condition: row["condition"] as CardListing["condition"],
      pricing_type: row["pricing_type"] as string,
      price: row["price"] as number | null,
      city: row["city"] as string,
      area: row["area"] as string | null,
      category: (row["categories"] as { name?: string } | null)?.name,
      image: undefined,
      created_at: row["created_at"] as string,
    })),
  };
}

export async function getCategories() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const { SAMPLE_CATEGORIES } = await import("@/lib/sample-data");
    return SAMPLE_CATEGORIES.map((c) => ({ ...c, live: false }));
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("name,slug,description")
    .eq("is_active", true)
    .order("sort_order");
  return (data ?? []).map((c) => ({ ...c, count: "", live: true }));
}

import type { Listing } from "@/types/marketplace";

/**
 * Clearly-identified SAMPLE data for local preview when Supabase is not
 * configured. Never presented as real activity. Production reads from
 * Supabase (see src/features/listings/queries.ts).
 */
export const SAMPLE_CATEGORIES = [
  { name: "Metals", slug: "metals", count: "Scrap iron, aluminium, copper" },
  { name: "Electronics", slug: "electronics", count: "Phones, laptops, parts" },
  { name: "Furniture", slug: "furniture", count: "Chairs, tables, doors" },
  { name: "Vehicle Parts", slug: "vehicle-parts", count: "Engines, tyres, spares" },
  { name: "Construction", slug: "construction-materials", count: "Cement, blocks, rods" },
  { name: "Appliances", slug: "appliances", count: "Fridges, cookers, ACs" },
  { name: "Plastics", slug: "plastics", count: "Drums, crates, PET" },
  { name: "Household", slug: "household-items", count: "Reusable home goods" },
] as const;

export const SAMPLE_LISTINGS: Array<
  Pick<Listing, "id" | "title" | "condition" | "pricing_type" | "price" | "city" | "area" | "created_at"> & {
    category: string;
    image: string;
  }
> = [
  {
    id: "sample-1",
    title: "Copper wire offcuts — ~25kg from site rewiring",
    condition: "scrap",
    pricing_type: "negotiable",
    price: 185000,
    city: "Abuja",
    area: "Garki",
    category: "Metals",
    image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&q=70",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    id: "sample-2",
    title: "HP laptop for parts — board fault, screen intact",
    condition: "for_parts",
    pricing_type: "fixed",
    price: 45000,
    city: "Abuja",
    area: "Wuse 2",
    category: "Electronics",
    image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&q=70",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
  },
  {
    id: "sample-3",
    title: "Six solid-wood dining chairs — need polish",
    condition: "used",
    pricing_type: "negotiable",
    price: 120000,
    city: "Abuja",
    area: "Maitama",
    category: "Furniture",
    image: "https://images.unsplash.com/photo-1503602642458-232111445657?w=800&q=70",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 49).toISOString(),
  },
  {
    id: "sample-4",
    title: "Toyota Corolla 2012 gearbox — used, working",
    condition: "used",
    pricing_type: "fixed",
    price: 280000,
    city: "Abuja",
    area: "Apo",
    category: "Vehicle Parts",
    image: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=800&q=70",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
  },
  {
    id: "sample-5",
    title: "Leftover 12mm iron rods — half tonne, site surplus",
    condition: "working",
    pricing_type: "negotiable",
    price: 520000,
    city: "Abuja",
    area: "Kubwa",
    category: "Construction",
    image: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=70",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(),
  },
  {
    id: "sample-6",
    title: "Double-door fridge — compressor fault, for repair",
    condition: "damaged",
    pricing_type: "offer",
    price: 60000,
    city: "Abuja",
    area: "Lugbe",
    category: "Appliances",
    image: "https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=800&q=70",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString(),
  },
  {
    id: "sample-7",
    title: "HDPE drums (20 pcs) — food-grade, rinsed",
    condition: "used",
    pricing_type: "fixed",
    price: 95000,
    city: "Abuja",
    area: "Idu Industrial",
    category: "Plastics",
    image: "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?w=800&q=70",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 150).toISOString(),
  },
  {
    id: "sample-8",
    title: "Office desks x10 — startup clear-out, free if you carry",
    condition: "used",
    pricing_type: "free",
    price: null,
    city: "Abuja",
    area: "Central Area",
    category: "Furniture",
    image: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=800&q=70",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 190).toISOString(),
  },
];

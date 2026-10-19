export type Condition =
  | "working"
  | "partially_usable"
  | "used"
  | "damaged"
  | "for_parts"
  | "scrap"
  | "unclassified";

export type ItemStatus =
  | "draft"
  | "pending_review"
  | "published"
  | "rejected"
  | "sold"
  | "archived";

export type PricingType = "fixed" | "negotiable" | "free" | "offer";

export type InquiryStatus = "open" | "replied" | "closed";

export type ReportStatus = "open" | "under_review" | "resolved" | "dismissed";

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parent_id: string | null;
  icon_key: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface Profile {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_path: string | null;
  city: string | null;
  area: string | null;
  account_type: string | null;
  bio: string | null;
  created_at: string;
}

export interface Listing {
  id: string;
  seller_id: string;
  category_id: string | null;
  title: string;
  slug: string;
  description: string;
  condition: Condition;
  item_status: ItemStatus;
  pricing_type: PricingType;
  price: number | null;
  negotiable: boolean;
  quantity: number | null;
  quantity_unit: string | null;
  city: string;
  area: string | null;
  pickup_notes: string | null;
  published_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  categories?: Pick<Category, "name" | "slug"> | null;
  listing_images?: ListingImage[];
  profiles?: Pick<Profile, "display_name" | "city" | "area"> | null;
}

export interface ListingImage {
  id: string;
  listing_id: string;
  storage_path: string;
  alt_text: string | null;
  sort_order: number;
}

export interface Inquiry {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  message: string;
  status: InquiryStatus;
  created_at: string;
}

export const CONDITION_LABELS: Record<Condition, string> = {
  working: "Working",
  partially_usable: "Partially usable",
  used: "Used",
  damaged: "Damaged",
  for_parts: "For parts",
  scrap: "Scrap",
  unclassified: "Unclassified",
};

export const PRICING_LABELS: Record<PricingType, string> = {
  fixed: "Fixed price",
  negotiable: "Negotiable",
  free: "Free",
  offer: "Make an offer",
};

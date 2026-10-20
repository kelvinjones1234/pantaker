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

export type ReportStatus = "open" | "reviewing" | "resolved" | "dismissed";

/**
 * Seller-managed sale lifecycle (see supabase/migrations/0002_sales.sql). There
 * is no "paid" status: Pantaker doesn't process or verify payments.
 */
export type SaleStatus =
  | "awaiting_confirmation"
  | "reserved"
  | "collection_arranged"
  | "completed"
  | "cancelled";

export interface Sale {
  id: string;
  listing_id: string;
  seller_id: string;
  buyer_id: string | null;
  buyer_label: string | null;
  source_inquiry_id: string | null;
  agreed_price: number | null;
  status: SaleStatus;
  collection_notes: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Messaging types. A conversation is an `inquiries` row repurposed as the thread
 * header (see supabase/migrations/0003_messaging.sql); `Message` rows are its
 * immutable history. Roles are resolved from the session, never from the client.
 */
export type ConversationRole = "buyer" | "seller";

export interface Message {
  id: string;
  inquiry_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  last_message_at: string;
  created_at: string;
  buyer_last_read_at: string | null;
  seller_last_read_at: string | null;
}

export interface ConversationParticipant {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_path: string | null;
}

export interface ConversationListingRef {
  id: string;
  title: string;
  slug: string;
  item_status: ItemStatus;
}

/** One row in an inbox: the thread plus everything needed to render it. */
export interface ConversationSummary {
  id: string;
  role: ConversationRole;
  other: ConversationParticipant | null;
  listing: ConversationListingRef | null;
  lastMessage: Message | null;
  unreadCount: number;
  updatedAt: string;
  blockedByMe: boolean;
  blockedMe: boolean;
}

export interface Block {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

/**
 * In-app notifications (see supabase/migrations/0004_notifications.sql). Only
 * events Pantaker actually produces are represented, and every row belongs to one
 * recipient. Rows are written by trusted database functions, never by the client.
 */
export type NotificationType =
  | "listing_published"
  | "listing_rejected"
  | "new_message"
  | "sale_status_changed"
  | "account_email_change";

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  href: string;
  listing_id: string | null;
  conversation_id: string | null;
  sale_id: string | null;
  actor_id: string | null;
  read_at: string | null;
  created_at: string;
}

/** One row per user. A missing row means every preference is on. */
export interface NotificationPreferences {
  user_id: string;
  messages: boolean;
  sale_updates: boolean;
  listing_updates: boolean;
  updated_at: string;
}

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
  default_area: string | null;
  default_pickup_notes: string | null;
  deletion_requested_at: string | null;
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

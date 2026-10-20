export const brand = {
  name: "PANTAKER",
  tagline: "Give unwanted things another chance.",
  supportingCopy:
    "Discover scrap, used items, and recoverable materials from people and businesses around you.",
  secondaryMessages: [
    "Your unwanted items still have value.",
    "Find value in what's left.",
    "Sell what you don't need. Find what others do.",
  ],
  launchCity: "Abuja, FCT",
  currency: "NGN" as const,
  currencySymbol: "₦",
} as const;

export const siteConfig = {
  name: "Pantaker",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? null,
  description:
    "Pantaker is a circular economy marketplace for unwanted items, scrap, and recoverable materials. Launching in Abuja, Nigeria.",
  locale: "en-NG",
} as const;

export const uploadLimits = {
  maxImages: 3,
  maxBytes: 5 * 1024 * 1024, // 5MB per image
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
} as const;

/**
 * Weight units for scrap listings. Every item is treated as scrap, so quantity
 * is expressed together with its weight unit.
 */
export const weightUnits = [
  { value: "kg", label: "Kilograms (kg)" },
  { value: "tonnes", label: "Tonnes (t)" },
  { value: "grams", label: "Grams (g)" },
] as const;

export const paginationDefaults = {
  marketplacePageSize: 24,
  dashboardPageSize: 20,
} as const;

/**
 * Abuse controls for messaging. Enforced server-side in every send/start
 * action — the browser is never trusted to self-limit.
 */
export const messagingLimits = {
  /** Max unread/last-message threads loaded into one inbox. */
  inboxPageSize: 100,
  /** Max messages fetched for a single conversation view (most recent first). */
  threadPageSize: 500,
  /** Max recent messages scanned to build inbox previews / unread counts. */
  inboxMessagesScan: 2000,
  /** Max messages a single sender may post per minute. */
  messagesPerMinute: 20,
  /** Max new conversations a single buyer may open per hour. */
  newConversationsPerHour: 10,
  /** Max characters in one message body. */
  maxBodyLength: 2000,
} as const;

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
  description:
    "Pantaker is a circular economy marketplace for unwanted items, scrap, and recoverable materials. Launching in Abuja, Nigeria.",
  locale: "en-NG",
} as const;

export const uploadLimits = {
  maxImages: 6,
  maxBytes: 5 * 1024 * 1024, // 5MB per image
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
} as const;

export const paginationDefaults = {
  marketplacePageSize: 24,
  dashboardPageSize: 20,
} as const;

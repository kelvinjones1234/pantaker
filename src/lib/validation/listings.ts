import { z } from "zod";
import { uploadLimits } from "@/config/site";
import {
  isLegacyImageId,
  isSafeObjectKey,
} from "@/lib/storage/object-keys";

export const conditionSchema = z.enum([
  "working",
  "partially_usable",
  "used",
  "damaged",
  "for_parts",
  "scrap",
  "unclassified",
]);

function isLegacyHttpImageUrl(value: string): boolean {
  if (value.length > 2048 || !/^https?:\/\//i.test(value)) return false;
  try {
    const url = new URL(value);
    return !url.username && !url.password;
  } catch {
    return false;
  }
}

/** R2 object keys plus read-only legacy references retained during migration. */
export const storedImageIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(2048)
  .refine(
    (value) =>
      isSafeObjectKey(value) ||
      isLegacyImageId(value) ||
      isLegacyHttpImageUrl(value),
    "One of the uploaded photos is invalid.",
  );

/** Ordered list of uploaded image keys (first is the cover). Optional. */
export const listingImageIdsSchema = z
  .array(storedImageIdSchema)
  .max(uploadLimits.maxImages, `You can add up to ${uploadLimits.maxImages} photos.`)
  .refine(
    (values) => new Set(values).size === values.length,
    "Each photo can only be added once.",
  );

export const pricingTypeSchema = z.enum(["fixed", "negotiable", "free", "offer"]);

export const createListingSchema = z
  .object({
    title: z.string().trim().min(6, "Give your listing a clear title (min 6 characters).").max(120),
    category_id: z.string().uuid("Choose a category."),
    description: z
      .string()
      .trim()
      .min(20, "Describe the item, its faults, and what's included (min 20 characters).")
      .max(4000),
    condition: conditionSchema,
    pricing_type: pricingTypeSchema,
    // Whole naira only — money is never handled as a floating-point value.
    price: z.coerce
      .number()
      .int("Enter a whole naira amount.")
      .nonnegative("Price cannot be negative.")
      .nullable()
      .optional(),
    negotiable: z.boolean().default(false),
    quantity: z.coerce.number().positive("Quantity must be positive.").nullable().optional(),
    quantity_unit: z.string().trim().max(24).nullable().optional(),
    city: z.string().trim().min(2).max(80),
    area: z.string().trim().max(120).nullable().optional(),
    pickup_notes: z.string().trim().max(500).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.pricing_type === "free" && data.price != null && data.price !== 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["price"],
        message: "Free listings must not set a price. Leave price empty.",
      });
    }
    if (
      (data.pricing_type === "fixed" || data.pricing_type === "negotiable") &&
      (data.price == null || Number.isNaN(data.price))
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["price"],
        message: "Enter a price in NGN for this pricing type.",
      });
    }
  });

export type CreateListingInput = z.infer<typeof createListingSchema>;

export const inquirySchema = z.object({
  listing_id: z.string().uuid(),
  message: z.string().trim().min(5, "Say a little about what you want.").max(1000),
});

export const reportSchema = z.object({
  listing_id: z.string().uuid(),
  reason: z.string().trim().min(3).max(120),
  details: z.string().trim().min(10, "Add a short explanation.").max(2000),
});

export const accountTypeSchema = z.enum(["individual", "business"]);

export const profileSchema = z.object({
  display_name: z.string().trim().min(2, "Add a display name (min 2 characters).").max(80),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_]{3,24}$/, "Use 3–24 letters, numbers, or underscores.")
    .or(z.literal(""))
    .optional()
    .transform((value) => (value ? value : null)),
  account_type: accountTypeSchema.catch("individual"),
  city: z.string().trim().max(80).nullable().optional(),
  area: z.string().trim().max(120).nullable().optional(),
  bio: z.string().trim().max(500).nullable().optional(),
});

export type ProfileInput = z.infer<typeof profileSchema>;

export const marketplaceFilterSchema = z.object({
  q: z.string().max(120).optional().default(""),
  category: z.string().max(80).optional().default(""),
  group: z.string().max(80).optional().default(""),
  condition: z.string().max(40).optional().default(""),
  pricing: z.enum(["fixed", "negotiable", "free", "offer"]).optional(),
  city: z.string().max(80).optional().default(""),
  area: z.string().max(120).optional().default(""),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  sort: z.enum(["newest", "price_asc", "price_desc"]).optional().default("newest"),
  page: z.coerce.number().int().min(1).optional().default(1),
});

export type MarketplaceFilters = z.infer<typeof marketplaceFilterSchema>;

/** Whether a creation submission should be kept private or sent to moderation. */
export const listingIntentSchema = z.enum(["draft", "publish"]);
export type ListingIntent = z.infer<typeof listingIntentSchema>;

export const sellerListingSortSchema = z.enum([
  "newest",
  "oldest",
  "updated",
  "price_asc",
  "price_desc",
  "title_asc",
]);
export type SellerListingSort = z.infer<typeof sellerListingSortSchema>;

/**
 * Filters for the seller's own listing management page. Every field is lenient
 * (`.catch`) so an invalid or tampered query parameter falls back to a safe
 * default instead of throwing — the value is still validated before use.
 */
export const sellerListingFilterSchema = z.object({
  q: z.string().trim().max(120).catch(""),
  status: z
    .enum(["", "draft", "pending_review", "published", "rejected", "sold", "archived"])
    .catch(""),
  category: z.string().max(60).catch(""),
  sort: sellerListingSortSchema.catch("newest"),
  page: z.coerce.number().int().min(1).catch(1),
});
export type SellerListingFilters = z.infer<typeof sellerListingFilterSchema>;

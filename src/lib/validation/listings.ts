import { z } from "zod";

export const conditionSchema = z.enum([
  "working",
  "used",
  "damaged",
  "for_parts",
  "scrap",
  "unclassified",
]);

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
    price: z.coerce.number().nonnegative("Price cannot be negative.").nullable().optional(),
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

export const profileSchema = z.object({
  display_name: z.string().trim().min(2).max(80),
  city: z.string().trim().max(80).nullable().optional(),
  area: z.string().trim().max(120).nullable().optional(),
  bio: z.string().trim().max(500).nullable().optional(),
});

export const marketplaceFilterSchema = z.object({
  q: z.string().max(120).optional().default(""),
  category: z.string().max(80).optional().default(""),
  condition: z.string().max(40).optional().default(""),
  city: z.string().max(80).optional().default(""),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  sort: z.enum(["newest", "price_asc", "price_desc"]).optional().default("newest"),
  page: z.coerce.number().int().min(1).optional().default(1),
});

export type MarketplaceFilters = z.infer<typeof marketplaceFilterSchema>;

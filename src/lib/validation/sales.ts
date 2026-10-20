import { z } from "zod";

export const saleStatusSchema = z.enum([
  "awaiting_confirmation",
  "reserved",
  "collection_arranged",
  "completed",
  "cancelled",
]);

/** Optional free text: an empty submission is stored as null, never "". */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep this under ${max} characters.`)
    .nullable()
    .optional()
    .transform((value) => (value ? value : null));

/**
 * Optional whole-naira amount. Empty input becomes null (not 0), and money is
 * never handled as a float. This is what the seller recorded, not a verified
 * payment — nothing in the sales system processes or confirms money.
 */
const agreedPrice = z.preprocess(
  (value) => (value === "" || value == null ? null : value),
  z.coerce
    .number({ invalid_type_error: "Enter a whole naira amount." })
    .int("Enter a whole naira amount.")
    .nonnegative("Price cannot be negative.")
    .nullable(),
);

export const createSaleSchema = z.object({
  listing_id: z.string().uuid("Choose which listing sold."),
  source_inquiry_id: z.preprocess(
    (value) => (value === "" || value == null ? null : value),
    z.string().uuid("That enquiry is invalid.").nullable(),
  ),
  buyer_label: optionalText(80),
  agreed_price: agreedPrice,
  collection_notes: optionalText(300),
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>;

export const updateSaleDetailsSchema = z.object({
  buyer_label: optionalText(80),
  agreed_price: agreedPrice,
  collection_notes: optionalText(300),
});

export type UpdateSaleDetailsInput = z.infer<typeof updateSaleDetailsSchema>;

export const saleStatusChangeSchema = z.object({
  status: saleStatusSchema,
  collection_notes: optionalText(300),
});

export type SaleStatusChangeInput = z.infer<typeof saleStatusChangeSchema>;

/**
 * Lenient filter for the Sales page. Invalid values fall back to safe defaults
 * instead of throwing — the value is still validated before it reaches a query.
 */
export const salesFilterSchema = z.object({
  status: z
    .enum(["", "awaiting_confirmation", "reserved", "collection_arranged", "completed", "cancelled"])
    .catch(""),
});

export type SalesFilters = z.infer<typeof salesFilterSchema>;

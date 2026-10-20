import { z } from "zod";
import { ABUJA_AREAS, ALL_ABUJA } from "@/lib/areas";

const AREA_NAMES = ABUJA_AREAS.filter((area) => area.name !== ALL_ABUJA).map((area) => area.name);

/** Normalise an optional form string to a trimmed value or null. */
function emptyToNull(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/**
 * Listing-preference defaults. Only fields the app actually prefills on the
 * `/sell` form are accepted — nothing here is decorative.
 */
export const listingPreferencesSchema = z.object({
  default_area: z
    .string()
    .optional()
    .nullable()
    .transform(emptyToNull)
    .refine((value) => value === null || AREA_NAMES.includes(value), {
      message: "Choose a district Pantaker serves in Abuja.",
    }),
  default_pickup_notes: z
    .string()
    .optional()
    .nullable()
    .transform(emptyToNull)
    .refine((value) => value === null || value.length <= 160, {
      message: "Keep collection notes under 160 characters.",
    }),
});

export type ListingPreferencesInput = z.infer<typeof listingPreferencesSchema>;

/** The exact word a seller must type to confirm account deletion. */
export const DELETE_CONFIRMATION_PHRASE = "DELETE";

export const deleteAccountSchema = z.object({
  confirm: z
    .string({ required_error: "Type DELETE to confirm." })
    .trim()
    .refine((value) => value === DELETE_CONFIRMATION_PHRASE, {
      message: `Type ${DELETE_CONFIRMATION_PHRASE} to confirm.`,
    }),
});

export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;

import { describe, expect, it } from "vitest";
import {
  DELETE_CONFIRMATION_PHRASE,
  deleteAccountSchema,
  listingPreferencesSchema,
} from "@/lib/validation/settings";

describe("listing preference validation", () => {
  it("accepts a served district and trims notes", () => {
    const parsed = listingPreferencesSchema.parse({
      default_area: "Apo",
      default_pickup_notes: "  Pickup at workshop  ",
    });
    expect(parsed.default_area).toBe("Apo");
    expect(parsed.default_pickup_notes).toBe("Pickup at workshop");
  });

  it("normalises blank and missing values to null", () => {
    const parsed = listingPreferencesSchema.parse({
      default_area: "",
      default_pickup_notes: "   ",
    });
    expect(parsed.default_area).toBeNull();
    expect(parsed.default_pickup_notes).toBeNull();
    expect(listingPreferencesSchema.parse({}).default_area).toBeNull();
  });

  it("rejects a district Pantaker does not serve", () => {
    expect(listingPreferencesSchema.safeParse({ default_area: "Lagos" }).success).toBe(false);
    expect(listingPreferencesSchema.safeParse({ default_area: "All Abuja" }).success).toBe(false);
  });

  it("rejects over-long collection notes", () => {
    expect(
      listingPreferencesSchema.safeParse({ default_pickup_notes: "x".repeat(161) }).success,
    ).toBe(false);
  });
});

describe("account deletion validation", () => {
  it("requires the exact confirmation phrase", () => {
    expect(deleteAccountSchema.safeParse({ confirm: DELETE_CONFIRMATION_PHRASE }).success).toBe(true);
    expect(deleteAccountSchema.safeParse({ confirm: "delete" }).success).toBe(false);
    expect(deleteAccountSchema.safeParse({ confirm: " DELETE " }).success).toBe(true);
    expect(deleteAccountSchema.safeParse({}).success).toBe(false);
  });
});

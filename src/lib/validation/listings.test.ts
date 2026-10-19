import { describe, expect, it } from "vitest";
import {
  createListingSchema,
  inquirySchema,
  listingImageIdsSchema,
  marketplaceFilterSchema,
  reportSchema,
} from "@/lib/validation/listings";

describe("listing pricing rules", () => {
  const base = {
    title: "Copper wire offcuts, 25kg",
    category_id: "123e4567-e89b-12d3-a456-426614174000",
    description: "Stripped copper offcuts from a site rewiring job in Garki. Buyer arranges pickup.",
    condition: "scrap" as const,
    city: "Abuja",
  };

  it("rejects free listings with a price", () => {
    const r = createListingSchema.safeParse({ ...base, pricing_type: "free", price: 5000 });
    expect(r.success).toBe(false);
  });

  it("accepts free listings without a price", () => {
    const r = createListingSchema.safeParse({ ...base, pricing_type: "free", price: null });
    expect(r.success).toBe(true);
  });

  it("requires a price for fixed listings", () => {
    const r = createListingSchema.safeParse({ ...base, pricing_type: "fixed", price: null });
    expect(r.success).toBe(false);
  });

  it("rejects negative prices", () => {
    const r = createListingSchema.safeParse({ ...base, pricing_type: "fixed", price: -10 });
    expect(r.success).toBe(false);
  });

  it("accepts a partially usable condition", () => {
    const r = createListingSchema.safeParse({
      ...base,
      condition: "partially_usable",
      pricing_type: "negotiable",
      price: 12000,
    });
    expect(r.success).toBe(true);
  });
});

describe("inquiry + report validation", () => {
  it("rejects empty inquiry messages", () => {
    expect(
      inquirySchema.safeParse({ listing_id: "123e4567-e89b-12d3-a456-426614174000", message: "hi" }).success,
    ).toBe(false);
  });

  it("rejects short report details", () => {
    expect(
      reportSchema.safeParse({
        listing_id: "123e4567-e89b-12d3-a456-426614174000",
        reason: "Fraud",
        details: "bad",
      }).success,
    ).toBe(false);
  });
});

describe("listing image ids", () => {
  it("accepts an empty list (photos are optional)", () => {
    expect(listingImageIdsSchema.safeParse([]).success).toBe(true);
  });

  it("accepts ordered Cloudflare image ids", () => {
    const r = listingImageIdsSchema.safeParse(["aB3-_x", "Zz09"]);
    expect(r.success).toBe(true);
  });

  it("rejects ids with unsafe characters", () => {
    expect(listingImageIdsSchema.safeParse(["../secret"]).success).toBe(false);
  });

  it("rejects more than the max upload count", () => {
    const tooMany = Array.from({ length: 7 }, (_, i) => `img${i}`);
    expect(listingImageIdsSchema.safeParse(tooMany).success).toBe(false);
  });
});

describe("marketplace filters", () => {
  it("defaults page to 1 and sort to newest", () => {
    const r = marketplaceFilterSchema.safeParse({});
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.page).toBe(1);
      expect(r.data.sort).toBe("newest");
    }
  });

  it("rejects invalid page numbers", () => {
    expect(marketplaceFilterSchema.safeParse({ page: 0 }).success).toBe(false);
  });
});

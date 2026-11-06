import { describe, expect, it } from "vitest";
import {
  createListingSchema,
  inquirySchema,
  listingImageIdsSchema,
  marketplaceFilterSchema,
  profileSchema,
  reportSchema,
  sellerListingFilterSchema,
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

  it("accepts ordered R2 object keys", () => {
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

describe("seller listing filters (lenient URL params)", () => {
  it("falls back to safe defaults when given nothing", () => {
    const r = sellerListingFilterSchema.parse({});
    expect(r).toMatchObject({ q: "", status: "", category: "", sort: "newest", page: 1 });
  });

  it("keeps valid values", () => {
    const r = sellerListingFilterSchema.parse({
      q: "copper",
      status: "published",
      sort: "oldest",
      page: "3",
    });
    expect(r).toMatchObject({ q: "copper", status: "published", sort: "oldest", page: 3 });
  });

  it("rejects an unknown status without throwing, defaulting it", () => {
    const r = sellerListingFilterSchema.parse({ status: "bogus" });
    expect(r.status).toBe("");
  });

  it("rejects an unknown sort and an out-of-range page", () => {
    const r = sellerListingFilterSchema.parse({ sort: "cheapest", page: "0" });
    expect(r.sort).toBe("newest");
    expect(r.page).toBe(1);
  });

  it("truncates an overly long search after a bad value is coerced", () => {
    const r = sellerListingFilterSchema.parse({ q: "x".repeat(500) });
    expect(r.q).toBe("");
  });
});

describe("money is whole naira", () => {
  const base = {
    title: "Copper wire offcuts, 25kg",
    category_id: "123e4567-e89b-12d3-a456-426614174000",
    description: "Stripped copper offcuts from a site rewiring job in Garki. Buyer arranges pickup.",
    condition: "scrap" as const,
    city: "Abuja",
  };

  it("rejects a fractional price", () => {
    const r = createListingSchema.safeParse({ ...base, pricing_type: "fixed", price: 4500.5 });
    expect(r.success).toBe(false);
  });

  it("accepts a whole naira price", () => {
    const r = createListingSchema.safeParse({ ...base, pricing_type: "fixed", price: 45000 });
    expect(r.success).toBe(true);
  });
});

describe("seller profile validation", () => {
  const base = { display_name: "Amina O.", account_type: "individual" };

  it("lowercases and accepts a valid username", () => {
    const r = profileSchema.parse({ ...base, username: "Amina_O" });
    expect(r.username).toBe("amina_o");
  });

  it("rejects a too-short or spaced username", () => {
    expect(profileSchema.safeParse({ ...base, username: "ab" }).success).toBe(false);
    expect(profileSchema.safeParse({ ...base, username: "bad name" }).success).toBe(false);
  });

  it("treats a blank username as none", () => {
    expect(profileSchema.parse({ ...base, username: "" }).username).toBeNull();
    expect(profileSchema.parse({ ...base }).username).toBeNull();
  });

  it("requires a display name", () => {
    expect(profileSchema.safeParse({ display_name: "A" }).success).toBe(false);
  });

  it("falls back to an individual account for an unknown type", () => {
    expect(profileSchema.parse({ ...base, account_type: "weird" }).account_type).toBe("individual");
  });

  it("strips the leading @ from social handles", () => {
    const r = profileSchema.parse({
      ...base,
      instagram_handle: "@Amina.Bello",
      x_handle: "@amina_b",
      facebook_handle: "amina.bello",
      tiktok_handle: "@amina.bello",
    });
    expect(r.instagram_handle).toBe("Amina.Bello");
    expect(r.x_handle).toBe("amina_b");
    expect(r.facebook_handle).toBe("amina.bello");
    expect(r.tiktok_handle).toBe("amina.bello");
  });

  it("treats blank contact fields as none", () => {
    const r = profileSchema.parse({
      ...base,
      phone: "",
      instagram_handle: "",
      x_handle: "",
      facebook_handle: "",
      tiktok_handle: "",
    });
    expect(r.phone).toBeNull();
    expect(r.instagram_handle).toBeNull();
    expect(r.x_handle).toBeNull();
    expect(r.facebook_handle).toBeNull();
    expect(r.tiktok_handle).toBeNull();
  });

  it("rejects full URLs and invalid handle characters", () => {
    expect(
      profileSchema.safeParse({
        ...base,
        instagram_handle: "https://instagram.com/amina",
      }).success,
    ).toBe(false);
    expect(
      profileSchema.safeParse({ ...base, x_handle: "bad handle" }).success,
    ).toBe(false);
    expect(
      profileSchema.safeParse({ ...base, tiktok_handle: "a".repeat(25) }).success,
    ).toBe(false);
  });

  it("keeps a free-text phone number but drops WhatsApp when there is no phone", () => {
    const withPhone = profileSchema.parse({
      ...base,
      phone: "+234 (803) 000-0000",
      phone_is_whatsapp: "true",
    });
    expect(withPhone.phone).toBe("+234 (803) 000-0000");
    expect(withPhone.phone_is_whatsapp).toBe(true);

    const withoutPhone = profileSchema.parse({
      ...base,
      phone: "",
      phone_is_whatsapp: "true",
    });
    expect(withoutPhone.phone).toBeNull();
    expect(withoutPhone.phone_is_whatsapp).toBe(false);
  });
});

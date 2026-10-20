import { describe, expect, it } from "vitest";
import {
  createSaleSchema,
  saleStatusChangeSchema,
  salesFilterSchema,
  updateSaleDetailsSchema,
} from "@/lib/validation/sales";

const LISTING_ID = "3f1c2a4e-5b6d-4e7f-8a90-1b2c3d4e5f60";
const INQUIRY_ID = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";

describe("createSaleSchema", () => {
  it("accepts a minimal sale and defaults optional fields to null", () => {
    const parsed = createSaleSchema.parse({
      listing_id: LISTING_ID,
      source_inquiry_id: "",
      buyer_label: "",
      agreed_price: "",
      collection_notes: "",
    });
    expect(parsed).toEqual({
      listing_id: LISTING_ID,
      source_inquiry_id: null,
      buyer_label: null,
      agreed_price: null,
      collection_notes: null,
    });
  });

  it("accepts a linked enquiry, buyer label, and whole-naira price", () => {
    const parsed = createSaleSchema.parse({
      listing_id: LISTING_ID,
      source_inquiry_id: INQUIRY_ID,
      buyer_label: "Ada from Wuse",
      agreed_price: "45000",
      collection_notes: "Pickup Saturday, 2pm",
    });
    expect(parsed.source_inquiry_id).toBe(INQUIRY_ID);
    expect(parsed.agreed_price).toBe(45000);
    expect(parsed.buyer_label).toBe("Ada from Wuse");
  });

  it("rejects a missing listing, a non-uuid enquiry, and fractional money", () => {
    expect(createSaleSchema.safeParse({ listing_id: "not-a-uuid" }).success).toBe(false);
    expect(
      createSaleSchema.safeParse({ listing_id: LISTING_ID, source_inquiry_id: "nope" }).success,
    ).toBe(false);
    expect(
      createSaleSchema.safeParse({ listing_id: LISTING_ID, agreed_price: "45000.5" }).success,
    ).toBe(false);
    expect(
      createSaleSchema.safeParse({ listing_id: LISTING_ID, agreed_price: "-1" }).success,
    ).toBe(false);
  });
});

describe("updateSaleDetailsSchema", () => {
  it("coerces an empty price to null rather than zero", () => {
    expect(updateSaleDetailsSchema.parse({ agreed_price: "" }).agreed_price).toBeNull();
    expect(updateSaleDetailsSchema.parse({ agreed_price: "0" }).agreed_price).toBe(0);
  });
});

describe("saleStatusChangeSchema", () => {
  it("only accepts known statuses", () => {
    expect(saleStatusChangeSchema.safeParse({ status: "reserved" }).success).toBe(true);
    expect(saleStatusChangeSchema.safeParse({ status: "paid" }).success).toBe(false);
    expect(saleStatusChangeSchema.safeParse({ status: "delivered" }).success).toBe(false);
  });
});

describe("salesFilterSchema", () => {
  it("falls back to all statuses for unknown input", () => {
    expect(salesFilterSchema.parse({ status: "paid" }).status).toBe("");
    expect(salesFilterSchema.parse({}).status).toBe("");
    expect(salesFilterSchema.parse({ status: "completed" }).status).toBe("completed");
  });
});

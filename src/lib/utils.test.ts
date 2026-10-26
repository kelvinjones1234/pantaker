import { describe, expect, it } from "vitest";
import { formatLongDate, formatNGN, formatQuantity, pricingLabel } from "@/lib/utils";

describe("money formatting (NGN)", () => {
  it("formats naira without decimals", () => {
    expect(formatNGN(185000)).toContain("185,000");
  });
  it("labels free listings", () => {
    expect(pricingLabel("free", null)).toBe("Free");
  });
  it("labels make-an-offer listings", () => {
    expect(pricingLabel("offer", null)).toBe("Make an offer");
  });
});

describe("quantity formatting", () => {
  it("uses item and items when no unit is set", () => {
    expect(formatQuantity(1, null)).toBe("1 item");
    expect(formatQuantity(15, "item")).toBe("15 items");
  });
  it("shortens known weight units", () => {
    expect(formatQuantity(25, "kg")).toBe("25 kg");
    expect(formatQuantity(1.5, "tonnes")).toBe("1.5 t");
    expect(formatQuantity(500, "grams")).toBe("500 g");
  });
  it("keeps unknown units and omits missing quantities", () => {
    expect(formatQuantity(8, "bags")).toBe("8 bags");
    expect(formatQuantity(null, "kg")).toBeNull();
  });
});

describe("date formatting", () => {
  it("formats a readable long date", () => {
    expect(formatLongDate("2026-10-26T12:00:00.000Z")).toContain("2026");
  });
  it("returns an empty string for missing dates", () => {
    expect(formatLongDate(null)).toBe("");
  });
});

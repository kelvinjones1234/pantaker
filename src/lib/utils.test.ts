import { describe, expect, it } from "vitest";
import { formatNGN, pricingLabel } from "@/lib/utils";

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

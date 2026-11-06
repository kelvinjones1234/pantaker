import { describe, expect, it } from "vitest";
import {
  ALL_ABUJA,
  areaQuery,
  parseArea,
  resolveArea,
  withArea,
} from "./areas";

describe("area preferences", () => {
  it("accepts served districts and decodes URL-encoded names", () => {
    expect(parseArea("Dei-Dei")).toBe("Dei-Dei");
    expect(parseArea("Mpape")).toBe("Mpape");
    expect(parseArea("Central%20Area")).toBe("Central Area");
  });

  it("rejects missing and unknown districts", () => {
    expect(parseArea("Lagos")).toBeNull();
    expect(parseArea("")).toBeNull();
    expect(parseArea(null)).toBeNull();
  });

  it("prefers a valid requested area over the saved preference", () => {
    expect(resolveArea("Mpape", "Dei-Dei")).toBe("Mpape");
    expect(resolveArea("Lagos", "Dei-Dei")).toBe("Dei-Dei");
    expect(resolveArea(null, "Lagos")).toBe(ALL_ABUJA);
  });

  it("serializes only non-default areas", () => {
    expect(areaQuery(ALL_ABUJA)).toBe("");
    expect(areaQuery("Mpape")).toBe("area=Mpape");
    expect(areaQuery("Central Area")).toBe("area=Central%20Area");
  });

  it("adds an area without breaking existing queries or hashes", () => {
    expect(withArea("/marketplace", "Mpape")).toBe(
      "/marketplace?area=Mpape",
    );
    expect(withArea("/marketplace?q=copper", "Mpape")).toBe(
      "/marketplace?q=copper&area=Mpape",
    );
    expect(withArea("/marketplace#feed", "Mpape")).toBe(
      "/marketplace?area=Mpape#feed",
    );
    expect(withArea("/marketplace", ALL_ABUJA)).toBe("/marketplace");
  });
});

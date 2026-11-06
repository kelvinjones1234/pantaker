import { describe, expect, it } from "vitest";
import { ALL_ABUJA, parseArea } from "@/lib/areas";
import { buildSearchParams, EMPTY_BROWSE, stateFromParams } from "./browse-state";

describe("browse area state", () => {
  it("uses the saved district when the URL has no area", () => {
    expect(stateFromParams({}, "Mpape").area).toBe("Mpape");
  });

  it("lets a valid URL area override the saved district", () => {
    expect(stateFromParams({ area: "Dei-Dei" }, "Mpape").area).toBe("Dei-Dei");
  });

  it("falls back when the URL contains an unknown district", () => {
    expect(stateFromParams({ area: "Lagos" }, "Mpape").area).toBe("Mpape");
    expect(stateFromParams({ area: "Lagos" }, "Lagos").area).toBe(ALL_ABUJA);
  });

  it("includes only non-default areas in browse URLs", () => {
    expect(buildSearchParams({ ...EMPTY_BROWSE, area: "Mpape" })).toContain(
      "area=Mpape",
    );
    expect(
      buildSearchParams({ ...EMPTY_BROWSE, area: ALL_ABUJA }),
    ).not.toContain("area=");
  });

  it("keeps parsed districts canonical", () => {
    expect(parseArea(stateFromParams({ area: "Central Area" }).area)).toBe(
      "Central Area",
    );
  });
});

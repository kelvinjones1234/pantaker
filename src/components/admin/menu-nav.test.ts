import { describe, expect, it } from "vitest";
import { nextMenuIndex } from "@/components/admin/menu-nav";

describe("nextMenuIndex", () => {
  it("moves down and wraps at the end", () => {
    expect(nextMenuIndex(0, 3, 1)).toBe(1);
    expect(nextMenuIndex(2, 3, 1)).toBe(0);
  });

  it("moves up and wraps at the start", () => {
    expect(nextMenuIndex(0, 3, -1)).toBe(2);
    expect(nextMenuIndex(1, 3, -1)).toBe(0);
  });

  it("enters the list correctly with no current focus", () => {
    expect(nextMenuIndex(-1, 3, 1)).toBe(0);
    expect(nextMenuIndex(-1, 3, -1)).toBe(2);
  });

  it("jumps to the ends", () => {
    expect(nextMenuIndex(1, 3, "first")).toBe(0);
    expect(nextMenuIndex(1, 3, "last")).toBe(2);
  });

  it("returns -1 for an empty list", () => {
    expect(nextMenuIndex(-1, 0, 1)).toBe(-1);
    expect(nextMenuIndex(0, 0, "last")).toBe(-1);
  });
});

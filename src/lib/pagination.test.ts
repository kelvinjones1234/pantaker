import { describe, expect, it } from "vitest";
import {
  clampPage,
  pageOffset,
  pageRange,
  pageWindow,
  totalPagesFor,
} from "@/lib/pagination";

describe("totalPagesFor", () => {
  it("returns 0 for no items and 1 for a partial first page", () => {
    expect(totalPagesFor(0, 20)).toBe(0);
    expect(totalPagesFor(1, 20)).toBe(1);
    expect(totalPagesFor(20, 20)).toBe(1);
    expect(totalPagesFor(21, 20)).toBe(2);
    expect(totalPagesFor(100, 20)).toBe(5);
  });

  it("guards against a non-positive page size or negative totals", () => {
    expect(totalPagesFor(10, 0)).toBe(0);
    expect(totalPagesFor(-5, 20)).toBe(0);
  });
});

describe("clampPage", () => {
  it("clamps into range and coerces junk to page 1", () => {
    expect(clampPage(3, 5)).toBe(3);
    expect(clampPage(0, 5)).toBe(1);
    expect(clampPage(-2, 5)).toBe(1);
    expect(clampPage(9, 5)).toBe(5);
    expect(clampPage(Number.NaN, 5)).toBe(1);
    expect(clampPage(2.9, 5)).toBe(2);
    expect(clampPage(4, 0)).toBe(1);
  });
});

describe("pageWindow", () => {
  it("lists every page when there are seven or fewer", () => {
    expect(pageWindow(1, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(pageWindow(7, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("adds gaps around the current page for long ranges", () => {
    expect(pageWindow(1, 20)).toEqual([1, 2, "gap", 20]);
    expect(pageWindow(10, 20)).toEqual([1, "gap", 9, 10, 11, "gap", 20]);
    expect(pageWindow(20, 20)).toEqual([1, "gap", 19, 20]);
  });

  it("returns nothing when there are no pages", () => {
    expect(pageWindow(1, 0)).toEqual([]);
  });
});

describe("pageRange", () => {
  it("reports the visible slice and total", () => {
    expect(pageRange(2, 20, 45)).toEqual({
      page: 2,
      totalPages: 3,
      from: 21,
      to: 40,
      total: 45,
    });
  });

  it("clamps an out-of-range page and shortens the last slice", () => {
    expect(pageRange(99, 20, 45)).toMatchObject({ page: 3, from: 41, to: 45 });
  });

  it("reports zeros for an empty result set", () => {
    expect(pageRange(1, 20, 0)).toEqual({
      page: 1,
      totalPages: 0,
      from: 0,
      to: 0,
      total: 0,
    });
  });
});

describe("pageOffset", () => {
  it("is zero-based and never negative", () => {
    expect(pageOffset(1, 20)).toBe(0);
    expect(pageOffset(3, 20)).toBe(40);
    expect(pageOffset(0, 20)).toBe(0);
  });
});

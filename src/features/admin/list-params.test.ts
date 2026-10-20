import { describe, expect, it } from "vitest";
import {
  buildQueryString,
  parseAdminListParams,
  parseDate,
  parseEnum,
  parsePage,
  parseSearchTerm,
  single,
  withQuery,
} from "@/features/admin/list-params";

describe("single", () => {
  it("takes the first repeated value, trims, and treats missing as empty", () => {
    expect(single([" a ", "b"])).toBe("a");
    expect(single("  x  ")).toBe("x");
    expect(single(undefined)).toBe("");
  });
});

describe("parseSearchTerm", () => {
  it("trims and caps the length", () => {
    expect(parseSearchTerm("  ada  ")).toBe("ada");
    expect(parseSearchTerm("x".repeat(200)).length).toBe(80);
    expect(parseSearchTerm(["first", "second"])).toBe("first");
  });
});

describe("parsePage", () => {
  it("accepts positive integers and falls back to 1 otherwise", () => {
    expect(parsePage("3")).toBe(3);
    expect(parsePage("1")).toBe(1);
    expect(parsePage("0")).toBe(1);
    expect(parsePage("-4")).toBe(1);
    expect(parsePage("2.5")).toBe(1);
    expect(parsePage("abc")).toBe(1);
    expect(parsePage(undefined)).toBe(1);
  });
});

describe("parseEnum", () => {
  const allowed = ["active", "suspended"] as const;

  it("accepts allowed values and drops unknown ones", () => {
    expect(parseEnum("active", allowed)).toBe("active");
    expect(parseEnum("banned", allowed)).toBe("");
    expect(parseEnum(["suspended"], allowed)).toBe("suspended");
    expect(parseEnum(undefined, allowed)).toBe("");
  });
});

describe("parseDate", () => {
  it("accepts only valid YYYY-MM-DD calendar dates", () => {
    expect(parseDate("2026-01-05")).toBe("2026-01-05");
    expect(parseDate("2026-13-99")).toBeNull();
    expect(parseDate("2026-1-5")).toBeNull();
    expect(parseDate("nope")).toBeNull();
    expect(parseDate(undefined)).toBeNull();
  });
});

describe("buildQueryString", () => {
  it("drops empty, null, undefined, and page 1", () => {
    expect(
      buildQueryString({ q: "ada", status: "", role: null, page: 1, category: undefined }),
    ).toBe("q=ada");
  });

  it("keeps real filters and encodes values", () => {
    expect(buildQueryString({ q: "ada & co", status: "suspended", page: 3 })).toBe(
      "q=ada+%26+co&status=suspended&page=3",
    );
  });
});

describe("withQuery", () => {
  it("omits the question mark when there is no query", () => {
    expect(withQuery("/admin/users", "")).toBe("/admin/users");
    expect(withQuery("/admin/users", "q=a")).toBe("/admin/users?q=a");
  });
});

describe("parseAdminListParams", () => {
  it("combines the shared list values safely", () => {
    expect(parseAdminListParams({ q: ["ada"], page: "2" })).toEqual({ q: "ada", page: 2 });
    expect(parseAdminListParams({})).toEqual({ q: "", page: 1 });
    expect(parseAdminListParams({ q: "x".repeat(120), page: "-1" })).toEqual({
      q: "x".repeat(80),
      page: 1,
    });
  });
});

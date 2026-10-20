import { describe, expect, it } from "vitest";
import {
  ADMIN_TIME_ZONE,
  adminDayStartIso,
  formatAdminDate,
  formatAdminDateTime,
  isValidDateValue,
} from "@/lib/datetime";

describe("isValidDateValue", () => {
  it("accepts ISO strings and rejects missing/invalid input", () => {
    expect(isValidDateValue("2026-01-05T10:00:00Z")).toBe(true);
    expect(isValidDateValue("")).toBe(false);
    expect(isValidDateValue("not-a-date")).toBe(false);
    expect(isValidDateValue(null)).toBe(false);
    expect(isValidDateValue(undefined)).toBe(false);
  });
});

describe("formatAdminDate", () => {
  it("formats in the fixed Abuja timezone", () => {
    expect(ADMIN_TIME_ZONE).toBe("Africa/Lagos");
    expect(formatAdminDate("2026-01-05T10:00:00Z")).toBe("5 Jan 2026");
  });

  it("rolls over the day using the admin timezone, not UTC", () => {
    // 23:30 UTC is 00:30 the next day in Lagos (UTC+1, no DST).
    const formatted = formatAdminDate("2026-01-05T23:30:00Z");
    expect(formatted).toContain("6");
    expect(formatted).toContain("Jan");
    expect(formatted).toContain("2026");
  });

  it("renders an em dash for missing or invalid values", () => {
    expect(formatAdminDate(null)).toBe("—");
    expect(formatAdminDate("nope")).toBe("—");
  });
});

describe("formatAdminDateTime", () => {
  it("includes a time component", () => {
    const formatted = formatAdminDateTime("2026-01-05T10:15:00Z");
    expect(formatted).toContain("Jan");
    expect(formatted).toMatch(/\d{2}:\d{2}/);
  });

  it("renders an em dash for invalid values", () => {
    expect(formatAdminDateTime(undefined)).toBe("—");
  });
});

describe("adminDayStartIso", () => {
  it("maps a calendar date to the start-of-day instant in Lagos", () => {
    expect(adminDayStartIso("2026-01-05")).toBe("2026-01-04T23:00:00.000Z");
  });

  it("rejects malformed dates", () => {
    expect(adminDayStartIso("2026-1-5")).toBeNull();
    expect(adminDayStartIso("nope")).toBeNull();
    expect(adminDayStartIso(null)).toBeNull();
  });
});

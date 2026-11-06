import { afterEach, describe, expect, it, vi } from "vitest";
import {
  amountToKobo,
  commissionFor,
  hashPickupCode,
  koboToAmount,
  pickupCodeFor,
  releaseDueFrom,
  sellerShareFor,
  verifyPickupCode,
} from "@/lib/bachs/money";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("money parsing", () => {
  it("parses decimal strings into kobo without floating point drift", () => {
    expect(amountToKobo("19.99")).toBe(1999);
    expect(amountToKobo("0.05")).toBe(5);
    expect(amountToKobo("25000")).toBe(2_500_000);
    expect(amountToKobo("10.5")).toBe(1050);
  });

  it("rejects malformed amounts", () => {
    expect(() => amountToKobo("1,000")).toThrow();
    expect(() => amountToKobo("-5")).toThrow();
    expect(() => amountToKobo("1.234")).toThrow();
  });

  it("serialises kobo back to a decimal string", () => {
    expect(koboToAmount(1999)).toBe("19.99");
    expect(koboToAmount(5)).toBe("0.05");
    expect(koboToAmount(2_500_000)).toBe("25000.00");
  });
});

describe("commission", () => {
  it("takes 5% and keeps the seller share whole", () => {
    expect(commissionFor(2_500_000)).toBe(125_000);
    expect(sellerShareFor(2_500_000)).toBe(2_375_000);
  });

  it("rounds the commission to the nearest kobo", () => {
    expect(commissionFor(999)).toBe(50);
    expect(sellerShareFor(999)).toBe(949);
  });
});

describe("pickup codes", () => {
  it("is deterministic for the same order and buyer", () => {
    vi.stubEnv("PICKUP_CODE_SECRET", "pickup-test-secret");
    const code = pickupCodeFor("order-1", "buyer-1");
    expect(code).toMatch(/^\d{6}$/);
    expect(pickupCodeFor("order-1", "buyer-1")).toBe(code);
  });

  it("prefers the dedicated pickup secret", () => {
    vi.stubEnv("AUTH_SECRET", "auth-secret");
    vi.stubEnv("PICKUP_CODE_SECRET", "pickup-secret");
    const dedicated = pickupCodeFor("order-1", "buyer-1");
    vi.stubEnv("PICKUP_CODE_SECRET", "");
    expect(pickupCodeFor("order-1", "buyer-1")).not.toBe(dedicated);
  });

  it("differs per order and verifies against the stored hash", () => {
    vi.stubEnv("PICKUP_CODE_SECRET", "pickup-test-secret");
    const code = pickupCodeFor("order-1", "buyer-1");
    const other = pickupCodeFor("order-2", "buyer-1");
    expect(other).not.toBe(code);
    expect(verifyPickupCode(code, hashPickupCode(code))).toBe(true);
    expect(verifyPickupCode(other, hashPickupCode(code))).toBe(false);
    expect(verifyPickupCode("12345", hashPickupCode(code))).toBe(false);
    expect(verifyPickupCode(code, null)).toBe(false);
  });
});

describe("release window", () => {
  it("is exactly 72 hours", () => {
    const start = new Date("2026-01-01T00:00:00.000Z");
    expect(releaseDueFrom(start).toISOString()).toBe("2026-01-04T00:00:00.000Z");
  });
});

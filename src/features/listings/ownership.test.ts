import { describe, expect, it } from "vitest";
import {
  assertOwnedBy,
  isOwnedBy,
  OwnershipError,
  resolveInquirySeller,
} from "@/features/listings/ownership";

const SELLER_A = "11111111-1111-1111-1111-111111111111";
const SELLER_B = "22222222-2222-2222-2222-222222222222";

describe("isOwnedBy", () => {
  it("treats a matching seller_id as owned", () => {
    expect(isOwnedBy({ seller_id: SELLER_A }, SELLER_A)).toBe(true);
  });

  it("rejects a record owned by another seller", () => {
    expect(isOwnedBy({ seller_id: SELLER_A }, SELLER_B)).toBe(false);
  });

  it("rejects missing/empty/foreign seller ids and anonymous callers", () => {
    expect(isOwnedBy(null, SELLER_A)).toBe(false);
    expect(isOwnedBy({ seller_id: null }, SELLER_A)).toBe(false);
    expect(isOwnedBy({ seller_id: "" }, SELLER_A)).toBe(false);
    expect(isOwnedBy({ seller_id: SELLER_A }, null)).toBe(false);
  });
});

describe("assertOwnedBy", () => {
  it("passes for the owner", () => {
    expect(() => assertOwnedBy({ seller_id: SELLER_A }, SELLER_A)).not.toThrow();
  });

  it("throws 403 when a different seller owns the record", () => {
    try {
      assertOwnedBy({ seller_id: SELLER_A }, SELLER_B);
      throw new Error("expected assertOwnedBy to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(OwnershipError);
      expect((error as OwnershipError).status).toBe(403);
    }
  });

  it("throws 404 when the record is invisible to the caller", () => {
    try {
      assertOwnedBy(null, SELLER_A);
      throw new Error("expected assertOwnedBy to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(OwnershipError);
      expect((error as OwnershipError).status).toBe(404);
    }
  });
});

describe("resolveInquirySeller", () => {
  it("resolves the seller from the listing row, not the caller", () => {
    expect(resolveInquirySeller({ seller_id: SELLER_A }, SELLER_B)).toEqual({
      ok: true,
      sellerId: SELLER_A,
    });
  });

  it("blocks inquiring on your own listing", () => {
    const result = resolveInquirySeller({ seller_id: SELLER_A }, SELLER_A);
    expect(result.ok).toBe(false);
  });

  it("rejects a missing listing or anonymous buyer", () => {
    expect(resolveInquirySeller(null, SELLER_B).ok).toBe(false);
    expect(resolveInquirySeller({ seller_id: SELLER_A }, null).ok).toBe(false);
  });
});

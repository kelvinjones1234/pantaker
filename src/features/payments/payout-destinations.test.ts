import { describe, expect, it } from "vitest";
import type { BachsPayoutDestination } from "@/lib/bachs/client";
import { maskedAccountNumber, primaryDestination } from "./payout-destinations";

function dest(overrides: Partial<BachsPayoutDestination>): BachsPayoutDestination {
  return { id: "pd_x", currency: "NGN", ...overrides } as BachsPayoutDestination;
}

describe("primaryDestination", () => {
  it("prefers the usable default", () => {
    const a = dest({ id: "pd_a", is_usable: true });
    const b = dest({ id: "pd_b", is_usable: true, is_default: true });
    expect(primaryDestination([a, b])?.id).toBe("pd_b");
  });

  it("falls back to a saved NGN account still under review", () => {
    const pending = dest({ id: "pd_p", is_usable: false, status: "pending_review" });
    expect(primaryDestination([pending])?.id).toBe("pd_p");
  });

  it("ignores non-NGN destinations", () => {
    const gbp = dest({ id: "pd_g", currency: "GBP", is_usable: true });
    expect(primaryDestination([gbp])).toBeNull();
  });
});

describe("maskedAccountNumber", () => {
  it("shows only the last four digits", () => {
    expect(maskedAccountNumber(dest({ account_number: "0123456789" }))).toBe("••••6789");
  });
});

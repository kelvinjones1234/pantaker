import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const client = vi.hoisted(() => ({
  listPayoutDestinations: vi.fn(),
}));

vi.mock("@/lib/bachs/client", () => client);
vi.mock("@/lib/prisma", () => ({ getPrisma: () => ({}) }));

import { loadSellerDestinations } from "./payouts";

describe("loadSellerDestinations", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    client.listPayoutDestinations.mockReset();
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it("returns ok with the destinations on success", async () => {
    const destinations = [{ id: "d1", is_usable: true }];
    client.listPayoutDestinations.mockResolvedValue(destinations);

    const result = await loadSellerDestinations("acct_1");

    expect(client.listPayoutDestinations).toHaveBeenCalledWith("acct_1");
    expect(result).toEqual({ ok: true, destinations });
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("returns an explicit error state and logs when Bachs fails", async () => {
    const failure = new Error("Bachs down");
    client.listPayoutDestinations.mockRejectedValue(failure);

    const result = await loadSellerDestinations("acct_1");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.destinations).toEqual([]);
    expect(result.error).toMatch(/could not reach bachs/i);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.any(String),
      failure,
    );
  });
});

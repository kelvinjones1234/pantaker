import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  prisma: {
    sellerPaymentAccount: { update: vi.fn() },
  },
  getConnectedAccount: vi.fn(),
  listPayoutDestinations: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ getPrisma: () => state.prisma }));
vi.mock("@/lib/db/context", () => ({
  withUserContext: async (_user: unknown, fn: (tx: unknown) => unknown) =>
    fn(state.prisma),
}));
vi.mock("@/lib/bachs/config", () => ({ publicSiteUrl: () => "https://x.test" }));
vi.mock("@/lib/bachs/client", () => ({
  createAccountLink: vi.fn(),
  createConnectedAccount: vi.fn(),
  getConnectedAccount: state.getConnectedAccount,
  listPayoutDestinations: state.listPayoutDestinations,
}));

import {
  refreshSellerPaymentAccount,
  sellerCanReceivePayments,
  sellerCanWithdraw,
} from "./seller-accounts";

const USER_ID = "00000000-0000-0000-0000-000000000001";

function accountRow(overrides: Record<string, unknown> = {}) {
  return {
    user_id: USER_ID,
    bachs_account_id: "acct_1",
    transfers_status: "active",
    payouts_status: "active",
    destination_usable: true,
    ...overrides,
  };
}

describe("sellerCanWithdraw", () => {
  it("requires active payouts and a usable destination", () => {
    expect(
      sellerCanWithdraw({ payouts_status: "active", destination_usable: true }),
    ).toBe(true);
  });

  it("is false when payouts are not active", () => {
    expect(
      sellerCanWithdraw({ payouts_status: "pending", destination_usable: true }),
    ).toBe(false);
  });

  it("is false when there is no usable destination", () => {
    expect(
      sellerCanWithdraw({ payouts_status: "active", destination_usable: false }),
    ).toBe(false);
  });

  it("is false when there is no account", () => {
    expect(sellerCanWithdraw(null)).toBe(false);
  });
});

describe("sellerCanReceivePayments", () => {
  it("is true only when transfers are active", () => {
    expect(sellerCanReceivePayments({ transfers_status: "active" })).toBe(true);
    expect(sellerCanReceivePayments({ transfers_status: "restricted" })).toBe(
      false,
    );
    expect(sellerCanReceivePayments(null)).toBe(false);
  });
});

describe("refreshSellerPaymentAccount", () => {
  beforeEach(() => {
    state.getConnectedAccount.mockReset();
    state.listPayoutDestinations.mockReset();
    state.prisma.sellerPaymentAccount.update.mockReset();
    state.prisma.sellerPaymentAccount.update.mockImplementation(
      async ({ data }: { data: unknown }) => data,
    );
  });

  it("marks the destination usable when an active NGN destination exists", async () => {
    state.getConnectedAccount.mockResolvedValue({
      capabilities: {
        transfers: { status: "active" },
        payouts: { status: "active" },
      },
    });
    state.listPayoutDestinations.mockResolvedValue([
      { id: "d1", is_usable: true, currency: "NGN" },
    ]);

    const result = (await refreshSellerPaymentAccount(accountRow())) as unknown as {
      destination_usable: boolean;
      payouts_status: string;
    };

    expect(state.listPayoutDestinations).toHaveBeenCalledWith("acct_1");
    expect(result.destination_usable).toBe(true);
    expect(result.payouts_status).toBe("active");
  });

  it("does not mark the destination usable when only non-NGN destinations exist", async () => {
    state.getConnectedAccount.mockResolvedValue({
      capabilities: { transfers: { status: "active" }, payouts: { status: "active" } },
    });
    state.listPayoutDestinations.mockResolvedValue([
      { id: "d1", is_usable: true, currency: "USD" },
    ]);

    const result = (await refreshSellerPaymentAccount(accountRow())) as unknown as {
      destination_usable: boolean;
    };
    expect(result.destination_usable).toBe(false);
  });

  it("treats a destination lookup failure as not usable instead of throwing", async () => {
    state.getConnectedAccount.mockResolvedValue({
      capabilities: { transfers: { status: "active" }, payouts: { status: "active" } },
    });
    state.listPayoutDestinations.mockRejectedValue(new Error("Bachs down"));

    const result = (await refreshSellerPaymentAccount(accountRow())) as unknown as {
      destination_usable: boolean;
    };
    expect(result.destination_usable).toBe(false);
  });

  it("skips destination lookup when payouts are not active", async () => {
    state.getConnectedAccount.mockResolvedValue({
      capabilities: { transfers: { status: "active" }, payouts: { status: "pending" } },
    });

    await refreshSellerPaymentAccount(accountRow());
    expect(state.listPayoutDestinations).not.toHaveBeenCalled();
  });

  it("records last_error and rethrows when the account read fails", async () => {
    state.getConnectedAccount.mockRejectedValue(new Error("Bachs unreachable"));

    await expect(refreshSellerPaymentAccount(accountRow())).rejects.toThrow(
      "Bachs unreachable",
    );
    expect(state.prisma.sellerPaymentAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ last_error: "Bachs unreachable" }),
      }),
    );
  });
});

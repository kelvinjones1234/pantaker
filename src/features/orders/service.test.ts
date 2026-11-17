import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  order: { findMany: vi.fn() },
  orderTransfer: { findMany: vi.fn(), update: vi.fn() },
  getTransfer: vi.fn(),
  withServiceContext: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    order: state.order,
    orderTransfer: state.orderTransfer,
  }),
}));
vi.mock("@/lib/db/context", () => ({
  withServiceContext: state.withServiceContext,
  withUserContext: vi.fn(),
}));
vi.mock("@/lib/bachs/config", () => ({
  getBachs: () => ({}),
  publicSiteUrl: () => "https://x.test",
}));
vi.mock("@/lib/bachs/client", () => {
  class BachsRestError extends Error {}
  return {
    BachsRestError,
    createRefund: vi.fn(),
    createTransfer: vi.fn(),
    getTransfer: state.getTransfer,
  };
});
vi.mock("@/features/payments/seller-accounts", () => ({
  getSellerPaymentAccount: vi.fn(),
  sellerCanReceivePayments: () => false,
}));
vi.mock("@/features/notifications/emit", () => ({
  emitOrderNotifications: vi.fn(),
}));

import {
  MAX_RELEASE_ATTEMPTS,
  expireStaleCheckouts,
  releaseDueOrders,
  reconcilePendingTransfers,
} from "./service";

describe("releaseDueOrders", () => {
  beforeEach(() => {
    state.order.findMany.mockReset().mockResolvedValue([]);
  });

  it("queries only handed-over orders that are due and under the retry cap", async () => {
    const result = await releaseDueOrders(10);

    expect(result).toEqual({ attempted: 0, released: 0 });
    expect(state.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "handed_over",
          release_attempts: { lt: MAX_RELEASE_ATTEMPTS },
          release_due_at: { lte: expect.any(Date) },
        }),
        take: 10,
      }),
    );
  });

  it("caps the retry budget at five attempts", () => {
    expect(MAX_RELEASE_ATTEMPTS).toBe(5);
  });
});

describe("expireStaleCheckouts", () => {
  beforeEach(() => {
    state.order.findMany.mockReset().mockResolvedValue([]);
    state.withServiceContext.mockReset();
  });

  it("returns 0 and opens no service transaction when nothing is stale", async () => {
    await expect(expireStaleCheckouts()).resolves.toBe(0);
    expect(state.withServiceContext).not.toHaveBeenCalled();
  });

  it("only considers pending-payment orders whose payment is not paid", async () => {
    await expireStaleCheckouts(5);
    expect(state.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "pending_payment",
          payment: { is: { status: { not: "paid" } } },
        }),
        take: 5,
      }),
    );
  });
});

describe("reconcilePendingTransfers", () => {
  beforeEach(() => {
    state.orderTransfer.findMany.mockReset().mockResolvedValue([]);
    state.orderTransfer.update.mockReset().mockResolvedValue({});
    state.getTransfer.mockReset();
  });

  it("leaves a still-pending transfer untouched except for its timestamp", async () => {
    state.orderTransfer.findMany.mockResolvedValue([
      {
        id: "t1",
        type: "release",
        bachs_transfer_id: "tr_1",
        order: { seller: null },
      },
    ]);
    state.getTransfer.mockResolvedValue({ id: "tr_1", status: "pending" });

    const result = await reconcilePendingTransfers();

    expect(result).toEqual({ checked: 1, paid: 0 });
    expect(state.getTransfer).toHaveBeenCalledWith("tr_1", null);
    expect(state.orderTransfer.update).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: { updated_at: expect.any(Date) },
    });
  });

  it("records the Bachs error on the transfer and keeps going", async () => {
    state.orderTransfer.findMany.mockResolvedValue([
      { id: "t1", type: "release", bachs_transfer_id: "tr_1", order: { seller: null } },
      { id: "t2", type: "release", bachs_transfer_id: "tr_2", order: { seller: null } },
    ]);
    state.getTransfer
      .mockRejectedValueOnce(new Error("Bachs timeout"))
      .mockResolvedValueOnce({ id: "tr_2", status: "pending" });

    const result = await reconcilePendingTransfers();

    expect(result.checked).toBe(2);
    expect(state.orderTransfer.update).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: { error: "Bachs timeout", updated_at: expect.any(Date) },
    });
    expect(state.orderTransfer.update).toHaveBeenCalledWith({
      where: { id: "t2" },
      data: { updated_at: expect.any(Date) },
    });
  });

  it("only selects pending transfers that have a Bachs id and are stale", async () => {
    await reconcilePendingTransfers(3);
    expect(state.orderTransfer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "pending",
          bachs_transfer_id: { not: null },
        }),
        take: 3,
      }),
    );
  });
});

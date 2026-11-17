import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  account: null as null | Record<string, unknown>,
  destinations: [] as Array<Record<string, unknown>>,
  destinationsError: null as null | Error,
  balances: null as null | { availableKobo: number; pendingKobo: number },
  createPayout: vi.fn(),
  payoutCreate: vi.fn(),
  payoutUpdate: vi.fn(),
  banks: [] as Array<{ name: string; code: string }>,
  resolveBankAccount: vi.fn(),
  createPayoutDestination: vi.fn(),
  setDefaultPayoutDestination: vi.fn(),
  deletePayoutDestination: vi.fn(),
  inFlightPayouts: 0,
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/features/auth/authorization", () => ({
  requireUserForAction: async () => ({
    id: "00000000-0000-0000-0000-000000000001",
    email: "seller@example.com",
    name: "Seller",
    admin_role: null,
  }),
}));
vi.mock("@/features/accounts/access", () => ({
  checkAccountCanWrite: async () => ({ ok: true }),
}));
vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    sellerPaymentAccount: {
      findUnique: async () => state.account,
      update: vi.fn(),
    },
    sellerPayout: {
      create: state.payoutCreate,
      update: state.payoutUpdate,
      count: async () => state.inFlightPayouts,
    },
  }),
}));
vi.mock("@/lib/db/context", () => ({
  withUserContext: async (_user: unknown, fn: (tx: unknown) => unknown) =>
    fn({ sellerPayout: { update: state.payoutUpdate } }),
}));
vi.mock("@/lib/bachs/config", () => ({ publicSiteUrl: () => "https://x.test" }));
vi.mock("@/lib/bachs/client", () => ({
  createAccountLink: vi.fn(),
  createConnectedAccount: vi.fn(),
  getConnectedAccount: vi.fn(),
  listPayoutDestinations: async () => {
    if (state.destinationsError) throw state.destinationsError;
    return state.destinations;
  },
  getBalances: async () => state.balances,
  createPayout: state.createPayout,
  listBanks: async () => state.banks,
  resolveBankAccount: state.resolveBankAccount,
  createPayoutDestination: state.createPayoutDestination,
  setDefaultPayoutDestination: state.setDefaultPayoutDestination,
  deletePayoutDestination: state.deletePayoutDestination,
}));

import {
  linkSellerBankAccountAction,
  requestSellerPayoutAction,
} from "./actions";

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

const WITHDRAWABLE = {
  bachs_account_id: "acct_1",
  payouts_status: "active",
  destination_usable: true,
};

describe("requestSellerPayoutAction guards", () => {
  beforeEach(() => {
    state.account = { ...WITHDRAWABLE };
    state.destinations = [{ id: "dst_1", is_usable: true, currency: "NGN" }];
    state.destinationsError = null;
    state.balances = { availableKobo: 1_000_000_00, pendingKobo: 0 };
    state.createPayout.mockReset().mockResolvedValue({
      id: "po_1",
      status: "completed",
    });
    state.payoutCreate.mockReset().mockResolvedValue({ id: "row_1" });
    state.payoutUpdate.mockReset().mockResolvedValue({});
  });

  it("asks for onboarding when no payment account exists", async () => {
    state.account = null;
    const result = await requestSellerPayoutAction(form({ amount: "500" }));
    expect(result).toEqual({ ok: false, error: "Start Bachs onboarding first." });
    expect(state.createPayout).not.toHaveBeenCalled();
  });

  it("refuses when payouts are not active", async () => {
    state.account = { ...WITHDRAWABLE, payouts_status: "pending" };
    const result = await requestSellerPayoutAction(form({ amount: "500" }));
    expect(result.ok).toBe(false);
    expect(state.createPayout).not.toHaveBeenCalled();
  });

  it("refuses when there is no usable destination on the account", async () => {
    state.account = { ...WITHDRAWABLE, destination_usable: false };
    const result = await requestSellerPayoutAction(form({ amount: "500" }));
    expect(result.ok).toBe(false);
    expect(state.createPayout).not.toHaveBeenCalled();
  });

  it("rejects amounts below the ₦100 minimum", async () => {
    const result = await requestSellerPayoutAction(form({ amount: "99.99" }));
    expect(result).toEqual({ ok: false, error: "The minimum withdrawal is ₦100." });
    expect(state.payoutCreate).not.toHaveBeenCalled();
  });

  it("rejects a non-numeric amount", async () => {
    const result = await requestSellerPayoutAction(form({ amount: "abc" }));
    expect(result).toEqual({ ok: false, error: "Enter a valid NGN amount." });
  });

  it("accepts exactly ₦100 and creates the payout", async () => {
    const result = await requestSellerPayoutAction(form({ amount: "100" }));
    expect(result.ok).toBe(true);
    expect(state.createPayout).toHaveBeenCalledWith(
      expect.objectContaining({ amount: "100.00", destination: "dst_1" }),
    );
  });

  it("refuses an explicit destination that is not usable", async () => {
    const result = await requestSellerPayoutAction(
      form({ amount: "500", destination_id: "dst_other" }),
    );
    expect(result.ok).toBe(false);
    expect(state.createPayout).not.toHaveBeenCalled();
  });

  it("returns a clear error when destinations cannot be read", async () => {
    state.destinationsError = new Error("Bachs down");
    const result = await requestSellerPayoutAction(form({ amount: "500" }));
    expect(result).toEqual({
      ok: false,
      error: "Could not read your Bachs payout destinations. Try again shortly.",
    });
    expect(state.createPayout).not.toHaveBeenCalled();
  });

  it("refuses amounts above the available balance", async () => {
    state.balances = { availableKobo: 50_00, pendingKobo: 0 };
    const result = await requestSellerPayoutAction(form({ amount: "500" }));
    expect(result.ok).toBe(false);
    expect(state.createPayout).not.toHaveBeenCalled();
  });
});

describe("linkSellerBankAccountAction", () => {
  beforeEach(() => {
    state.account = { ...WITHDRAWABLE };
    state.destinations = [];
    state.destinationsError = null;
    state.inFlightPayouts = 0;
    state.banks = [{ name: "GTBank", code: "058" }];
    state.resolveBankAccount.mockReset().mockResolvedValue({
      resolved: true,
      account_name: "ADA OKAFOR",
      account_number: "0123456789",
      message: null,
    });
    state.createPayoutDestination
      .mockReset()
      .mockResolvedValue({ id: "dst_new", is_usable: true, status: "approved" });
    state.setDefaultPayoutDestination.mockReset().mockResolvedValue({});
    state.deletePayoutDestination.mockReset().mockResolvedValue(undefined);
  });

  it("rejects a malformed account number before calling Bachs", async () => {
    const result = await linkSellerBankAccountAction(
      form({ account_number: "12345", bank_code: "058" }),
    );
    expect(result).toEqual({ ok: false, error: "Enter the 10-digit account number." });
    expect(state.resolveBankAccount).not.toHaveBeenCalled();
    expect(state.createPayoutDestination).not.toHaveBeenCalled();
  });

  it("rejects a bank code that is not on the Bachs list", async () => {
    const result = await linkSellerBankAccountAction(
      form({ account_number: "0123456789", bank_code: "999" }),
    );
    expect(result).toEqual({ ok: false, error: "Choose a bank from the list." });
    expect(state.createPayoutDestination).not.toHaveBeenCalled();
  });

  it("does not save when Bachs cannot confirm the account", async () => {
    state.resolveBankAccount.mockResolvedValue({
      resolved: false,
      account_name: null,
      account_number: null,
      message: "Account not found",
    });
    const result = await linkSellerBankAccountAction(
      form({ account_number: "0123456789", bank_code: "058" }),
    );
    expect(result).toEqual({ ok: false, error: "Account not found" });
    expect(state.createPayoutDestination).not.toHaveBeenCalled();
  });

  it("saves the destination with the resolved account name", async () => {
    const result = await linkSellerBankAccountAction(
      form({ account_number: "0123456789", bank_code: "058" }),
    );
    expect(result).toEqual({
      ok: true,
      message: "Linked GTBank account for ADA OKAFOR.",
    });
    expect(state.createPayoutDestination).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: "acct_1",
        accountNumber: "0123456789",
        accountName: "ADA OKAFOR",
        bankCode: "058",
        bankName: "GTBank",
      }),
    );
    expect(state.setDefaultPayoutDestination).toHaveBeenCalledWith({
      accountId: "acct_1",
      destinationId: "dst_new",
    });
    expect(state.deletePayoutDestination).not.toHaveBeenCalled();
  });

  it("switching replaces the old destination once the new one is approved", async () => {
    state.destinations = [
      {
        id: "dst_old",
        currency: "NGN",
        is_usable: true,
        is_default: true,
        bank_code: "044",
        account_number: "1111222233",
      },
    ];
    const result = await linkSellerBankAccountAction(
      form({ account_number: "0123456789", bank_code: "058" }),
    );
    expect(result.ok).toBe(true);
    expect(state.setDefaultPayoutDestination).toHaveBeenCalledWith({
      accountId: "acct_1",
      destinationId: "dst_new",
    });
    expect(state.deletePayoutDestination).toHaveBeenCalledWith({
      accountId: "acct_1",
      destinationId: "dst_old",
    });
  });

  it("keeps the old account when the new one still needs review", async () => {
    state.destinations = [
      { id: "dst_old", currency: "NGN", is_usable: true, is_default: true, bank_code: "044", account_number: "1111222233" },
    ];
    state.createPayoutDestination.mockResolvedValue({
      id: "dst_new",
      is_usable: false,
      status: "pending_review",
    });
    const result = await linkSellerBankAccountAction(
      form({ account_number: "0123456789", bank_code: "058" }),
    );
    expect(result).toEqual({
      ok: true,
      message:
        "Saved GTBank account for ADA OKAFOR. Bachs is reviewing it before it can receive withdrawals.",
    });
    expect(state.setDefaultPayoutDestination).not.toHaveBeenCalled();
    expect(state.deletePayoutDestination).not.toHaveBeenCalled();
  });

  it("refuses to add an account that is already the payout account", async () => {
    state.destinations = [
      { id: "dst_old", currency: "NGN", is_usable: true, is_default: true, bank_code: "058", account_number: "0123456789" },
    ];
    const result = await linkSellerBankAccountAction(
      form({ account_number: "0123456789", bank_code: "058" }),
    );
    expect(result).toEqual({ ok: false, error: "That is already your payout account." });
    expect(state.createPayoutDestination).not.toHaveBeenCalled();
  });

  it("blocks a switch while a withdrawal is still in flight", async () => {
    state.destinations = [
      { id: "dst_old", currency: "NGN", is_usable: true, is_default: true, bank_code: "044", account_number: "1111222233" },
    ];
    state.inFlightPayouts = 1;
    const result = await linkSellerBankAccountAction(
      form({ account_number: "0123456789", bank_code: "058" }),
    );
    expect(result).toEqual({
      ok: false,
      error: "Wait for your current withdrawal to finish, then switch accounts.",
    });
    expect(state.createPayoutDestination).not.toHaveBeenCalled();
    expect(state.deletePayoutDestination).not.toHaveBeenCalled();
  });

  it("does not save when the existing destinations cannot be read", async () => {
    state.destinationsError = new Error("Bachs down");
    const result = await linkSellerBankAccountAction(
      form({ account_number: "0123456789", bank_code: "058" }),
    );
    expect(result.ok).toBe(false);
    expect(state.createPayoutDestination).not.toHaveBeenCalled();
  });
});

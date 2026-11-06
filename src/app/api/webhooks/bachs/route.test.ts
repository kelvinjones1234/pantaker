import { beforeEach, describe, expect, it, vi } from "vitest";

type StoredEvent = {
  id: string;
  type: string;
  account_id: string | null;
  payload: unknown;
  event_created_at: Date | null;
  received_at: Date;
  processed_at: Date | null;
  error: string | null;
  attempts: number;
};

const state = vi.hoisted(() => ({
  events: new Map<string, StoredEvent>(),
  markPaid: vi.fn(),
  handleDispute: vi.fn(),
  handleRefund: vi.fn(),
  handleTransfer: vi.fn(),
  handlePayout: vi.fn(),
  refreshAccount: vi.fn(),
}));

vi.mock("@/lib/bachs/config", () => ({
  getBachsSettings: () => ({}),
}));

vi.mock("@/lib/bachs/webhook", () => ({
  verifyBachsWebhook: (rawBody: string) => JSON.parse(rawBody) as unknown,
}));

vi.mock("@/features/payments/seller-accounts", () => ({
  paymentAccountByBachsId: async () => null,
  refreshSellerPaymentAccount: state.refreshAccount,
}));

vi.mock("@/features/orders/service", () => {
  class OrderNotRetryableError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "OrderNotRetryableError";
    }
  }
  return {
    OrderNotRetryableError,
    markOrderPaidFromWebhook: state.markPaid,
    markCollectionFailedFromWebhook: vi.fn(),
    markCollectionUnderpaidFromWebhook: vi.fn(),
    markCheckoutExpiredFromWebhook: vi.fn(),
    handleRefundWebhook: state.handleRefund,
    handleDisputeWebhook: state.handleDispute,
    handleTransferWebhook: state.handleTransfer,
    handlePayoutWebhook: state.handlePayout,
  };
});

vi.mock("@/lib/db/context", () => ({
  withServiceContext: async (
    _actor: string | null,
    work: (tx: unknown) => Promise<unknown>,
  ) =>
    work({
      bachsWebhookEvent: {
        findUnique: async ({ where }: { where: { id: string } }) =>
          state.events.get(where.id) ?? null,
        create: async ({ data }: { data: StoredEvent }) => {
          state.events.set(data.id, {
            ...data,
            received_at: new Date(),
            processed_at: null,
            error: null,
            attempts: 1,
          });
        },
        update: async ({
          where,
          data,
        }: {
          where: { id: string };
          data: Partial<StoredEvent> & { attempts?: { increment: number } };
        }) => {
          const current = state.events.get(where.id);
          if (!current) return;
          if (data.attempts?.increment) {
            current.attempts += data.attempts.increment;
          }
          const { attempts: _attempts, ...rest } = data;
          Object.assign(current, rest);
        },
      },
    }),
}));

const { POST } = await import("@/app/api/webhooks/bachs/route");
const service = await import("@/features/orders/service");

function event(overrides: Record<string, unknown> = {}) {
  return {
    id: "evt_1",
    type: "collection.succeeded",
    created_at: "2026-08-07T11:00:00.000Z",
    organization_id: "org_1",
    data: {
      checkout_id: "chk_1",
      reference: "PTK-20260807-ACME",
      charge_id: "ch_1",
      amount: "100.00",
      currency: "NGN",
    },
    ...overrides,
  };
}

function post(body: unknown) {
  return POST(
    new Request("https://pantaker.example/api/webhooks/bachs", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );
}

beforeEach(() => {
  state.events.clear();
  vi.clearAllMocks();
});

describe("Bachs webhook route", () => {
  it("dispatches a verified collection and records the provider timestamp", async () => {
    const response = await post(event());

    expect(response.status).toBe(200);
    expect(state.markPaid).toHaveBeenCalledWith(
      expect.objectContaining({ checkout_id: "chk_1", charge_id: "ch_1" }),
    );
    const stored = state.events.get("evt_1");
    expect(stored?.processed_at).toBeInstanceOf(Date);
    expect(stored?.event_created_at?.toISOString()).toBe(
      "2026-08-07T11:00:00.000Z",
    );
  });

  it("does not replay an already processed delivery", async () => {
    state.events.set("evt_1", {
      id: "evt_1",
      type: "collection.succeeded",
      account_id: "org_1",
      payload: event().data,
      event_created_at: new Date(),
      received_at: new Date(),
      processed_at: new Date(),
      error: null,
      attempts: 1,
    });

    const response = await post(event());
    const body = (await response.json()) as { duplicate?: boolean };

    expect(response.status).toBe(200);
    expect(body.duplicate).toBe(true);
    expect(state.markPaid).not.toHaveBeenCalled();
  });

  it("returns 500 for retryable failures and stores the error", async () => {
    state.markPaid.mockRejectedValueOnce(new Error("database down"));

    const response = await post(event());
    const stored = state.events.get("evt_1");

    expect(response.status).toBe(500);
    expect(stored?.processed_at).toBeNull();
    expect(stored?.error).toBe("database down");
  });

  it("acknowledges non-retryable events without retrying forever", async () => {
    state.markPaid.mockRejectedValueOnce(
      new service.OrderNotRetryableError("No matching order."),
    );

    const response = await post(event());
    const body = (await response.json()) as { ignored?: boolean };
    const stored = state.events.get("evt_1");

    expect(response.status).toBe(200);
    expect(body.ignored).toBe(true);
    expect(stored?.processed_at).toBeInstanceOf(Date);
    expect(stored?.error).toBe("No matching order.");
  });

  it("passes the provider event time to dispute handling", async () => {
    await post(
      event({
        type: "dispute.updated",
        data: {
          dispute_id: "dsp_1",
          charge_id: "ch_1",
          status: "under_review",
        },
      }),
    );

    expect(state.handleDispute).toHaveBeenCalledWith(
      expect.objectContaining({
        disputeId: "dsp_1",
        occurredAt: new Date("2026-08-07T11:00:00.000Z"),
      }),
    );
  });
});

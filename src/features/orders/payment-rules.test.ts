import { describe, expect, it } from "vitest";
import {
  isDisputeEventStale,
  refundToRetry,
  transferStatusFromEvent,
} from "@/features/orders/payment-rules";

type Refund = { id: string; status: string; bachs_refund_id: string | null };

describe("refundToRetry", () => {
  it("reuses a pending attempt so a lost response cannot double refund", () => {
    const refunds: Refund[] = [
      { id: "failed", status: "failed", bachs_refund_id: null },
      { id: "pending", status: "pending", bachs_refund_id: "ref_1" },
    ];
    expect(refundToRetry(refunds)?.id).toBe("pending");
  });

  it("reuses a failed attempt that never reached a confirmed refund", () => {
    const refunds: Refund[] = [
      { id: "unknown", status: "failed", bachs_refund_id: null },
      { id: "confirmed", status: "failed", bachs_refund_id: "ref_2" },
    ];
    expect(refundToRetry(refunds)?.id).toBe("unknown");
  });

  it("starts a new attempt after a provider-confirmed failure", () => {
    const refunds: Refund[] = [
      { id: "confirmed", status: "failed", bachs_refund_id: "ref_2" },
    ];
    expect(refundToRetry(refunds)).toBeUndefined();
  });
});

describe("isDisputeEventStale", () => {
  const later = new Date("2026-08-07T12:00:00.000Z");
  const earlier = new Date("2026-08-07T11:00:00.000Z");

  it("rejects an event older than the last applied dispute update", () => {
    expect(isDisputeEventStale(later, earlier)).toBe(true);
  });

  it("accepts a newer event or when there is no baseline", () => {
    expect(isDisputeEventStale(earlier, later)).toBe(false);
    expect(isDisputeEventStale(null, earlier)).toBe(false);
    expect(isDisputeEventStale(later, null)).toBe(false);
  });
});

describe("transferStatusFromEvent", () => {
  it("maps terminal transfer events regardless of payload status", () => {
    expect(
      transferStatusFromEvent({
        type: "transfer.paid",
        status: "pending",
        currentStatus: "pending",
      }),
    ).toBe("paid");
    expect(
      transferStatusFromEvent({
        type: "transfer.failed",
        status: "paid",
        currentStatus: "pending",
      }),
    ).toBe("failed");
  });

  it("keeps the current status when a created event has no status", () => {
    expect(
      transferStatusFromEvent({
        type: "transfer.created",
        currentStatus: "paid",
      }),
    ).toBe("paid");
  });
});

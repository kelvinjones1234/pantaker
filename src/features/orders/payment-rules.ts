export interface RefundAttempt {
  status: string;
  bachs_refund_id: string | null;
}

/**
 * Pick a refund attempt that can safely reuse its idempotency key. A pending
 * row may be the result of a timeout after Bachs accepted the request, and a
 * failed row without a provider id never reached a confirmed provider refund.
 * A failed row with a provider id is a final provider failure, so a manual
 * retry starts a fresh attempt.
 */
export function refundToRetry<T extends RefundAttempt>(
  refunds: readonly T[],
): T | undefined {
  return (
    refunds.find((refund) => refund.status === "pending") ??
    refunds.find(
      (refund) => refund.status === "failed" && !refund.bachs_refund_id,
    )
  );
}

export function isDisputeEventStale(
  lastEventAt: Date | null | undefined,
  occurredAt: Date | null | undefined,
): boolean {
  if (!lastEventAt || !occurredAt) return false;
  return occurredAt.getTime() < lastEventAt.getTime();
}

export interface TransferEventInput {
  type: "transfer.created" | "transfer.paid" | "transfer.failed" | "transfer.updated";
  status?: string | null;
  currentStatus: string;
}

export function transferStatusFromEvent(input: TransferEventInput): string {
  if (input.type === "transfer.paid") return "paid";
  if (input.type === "transfer.failed") return "failed";
  return input.status ?? input.currentStatus;
}

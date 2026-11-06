export const ORDER_STATUSES = [
  "pending_payment",
  "held",
  "ready_for_handover",
  "handed_over",
  "released",
  "refund_pending",
  "refunded",
  "disputed",
  "release_blocked",
  "expired",
  "payment_failed",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Orders that still occupy a listing and prevent a second sale. */
export const ACTIVE_ORDER_STATUSES: readonly OrderStatus[] = [
  "pending_payment",
  "held",
  "ready_for_handover",
  "handed_over",
  "release_blocked",
  "disputed",
  "refund_pending",
];

export const PAID_ORDER_STATUSES: readonly OrderStatus[] = [
  "held",
  "ready_for_handover",
  "handed_over",
  "released",
  "release_blocked",
  "disputed",
  "refund_pending",
  "refunded",
];

export function isActiveOrderStatus(status: string): boolean {
  return (ACTIVE_ORDER_STATUSES as readonly string[]).includes(status);
}

export function isPaidOrderStatus(status: string): boolean {
  return (PAID_ORDER_STATUSES as readonly string[]).includes(status);
}

export const ORDER_STATUS_META: Record<
  OrderStatus,
  { label: string; description: string; tone: "neutral" | "success" | "warning" | "danger" }
> = {
  pending_payment: {
    label: "Awaiting payment",
    description: "The checkout is open. Pantaker has not received any money yet.",
    tone: "neutral",
  },
  held: {
    label: "Payment held",
    description:
      "Pantaker received the payment and is holding the seller's share until handover.",
    tone: "success",
  },
  ready_for_handover: {
    label: "Ready for handover",
    description:
      "The seller is ready. Exchange the item and the buyer's pickup code.",
    tone: "neutral",
  },
  handed_over: {
    label: "Handed over",
    description:
      "The item was collected. The seller is paid 72 hours after handover unless the buyer confirms sooner or a problem is raised.",
    tone: "neutral",
  },
  released: {
    label: "Seller paid",
    description: "The seller's share was sent to their Bachs account.",
    tone: "success",
  },
  refund_pending: {
    label: "Refund processing",
    description: "A refund was sent back to the buyer's payment method.",
    tone: "warning",
  },
  refunded: {
    label: "Refunded",
    description: "The buyer was refunded for this order.",
    tone: "neutral",
  },
  disputed: {
    label: "Disputed",
    description:
      "The buyer's bank raised a dispute. Pantaker is responding and the seller payout is on hold.",
    tone: "danger",
  },
  release_blocked: {
    label: "Issue raised",
    description:
      "The buyer raised a problem. Release is paused while Pantaker reviews it.",
    tone: "danger",
  },
  expired: {
    label: "Checkout expired",
    description: "The buyer did not complete the checkout in time.",
    tone: "neutral",
  },
  payment_failed: {
    label: "Payment failed",
    description: "The payment did not complete. No money was taken.",
    tone: "danger",
  },
  cancelled: {
    label: "Cancelled",
    description: "This order was cancelled.",
    tone: "neutral",
  },
};

export function orderStatusMeta(status: string) {
  return ORDER_STATUS_META[status as OrderStatus] ?? ORDER_STATUS_META.cancelled;
}

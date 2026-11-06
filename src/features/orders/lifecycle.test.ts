import { describe, expect, it } from "vitest";
import {
  ACTIVE_ORDER_STATUSES,
  isActiveOrderStatus,
  isPaidOrderStatus,
  ORDER_STATUSES,
  orderStatusMeta,
} from "@/features/orders/lifecycle";

describe("order lifecycle", () => {
  it("treats in-flight and disputed orders as active", () => {
    for (const status of [
      "pending_payment",
      "held",
      "ready_for_handover",
      "handed_over",
      "release_blocked",
      "disputed",
      "refund_pending",
    ]) {
      expect(isActiveOrderStatus(status)).toBe(true);
      expect(ACTIVE_ORDER_STATUSES).toContain(status);
    }
  });

  it("does not treat closed orders as active", () => {
    for (const status of [
      "released",
      "refunded",
      "expired",
      "payment_failed",
      "cancelled",
    ]) {
      expect(isActiveOrderStatus(status)).toBe(false);
    }
  });

  it("marks every money-bearing status as paid", () => {
    for (const status of [
      "held",
      "ready_for_handover",
      "handed_over",
      "released",
      "release_blocked",
      "disputed",
      "refund_pending",
      "refunded",
    ]) {
      expect(isPaidOrderStatus(status)).toBe(true);
    }
  });

  it("has metadata for every declared status", () => {
    for (const status of ORDER_STATUSES) {
      const meta = orderStatusMeta(status);
      expect(meta.label.length).toBeGreaterThan(0);
      expect(meta.description.length).toBeGreaterThan(0);
      expect(["neutral", "success", "warning", "danger"]).toContain(meta.tone);
    }
  });
});

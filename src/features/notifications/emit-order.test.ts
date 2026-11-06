import { describe, expect, it, vi } from "vitest";
import { emitOrderNotifications } from "@/features/notifications/emit";

type Writer = Parameters<typeof emitOrderNotifications>[0];

function writer(preferences: Array<{ user_id: string; order_updates: boolean }> = []) {
  const tx = {
    notificationPreference: {
      findMany: vi.fn(async () => preferences),
    },
    notification: {
      createMany: vi.fn(async () => ({ count: 1 })),
    },
  };
  return tx as unknown as typeof tx & Writer;
}

describe("emitOrderNotifications", () => {
  it("writes a deduped row for each recipient and skips muted users", async () => {
    const tx = writer([{ user_id: "seller-1", order_updates: false }]);

    await emitOrderNotifications(tx, {
      orderId: "order-1",
      event: "paid",
      recipients: [
        {
          userId: "buyer-1",
          title: "Payment received",
          body: "Pantaker is holding it.",
          href: "/orders/order-1",
        },
        {
          userId: "seller-1",
          title: "Order paid",
          href: "/seller/orders/order-1",
        },
      ],
    });

    expect(tx.notification.createMany).toHaveBeenCalledWith({
      data: [
        {
          user_id: "buyer-1",
          type: "order_paid",
          title: "Payment received",
          body: "Pantaker is holding it.",
          href: "/orders/order-1",
          dedupe_key: "order:order-1:paid",
        },
      ],
      skipDuplicates: true,
    });
  });

  it("uses the dedupe suffix for stateful events", async () => {
    const tx = writer();

    await emitOrderNotifications(tx, {
      orderId: "order-1",
      event: "disputed",
      dedupeSuffix: "disputed-under_review",
      recipients: [
        { userId: "buyer-1", title: "Dispute", href: "/orders/order-1" },
      ],
    });

    expect(tx.notification.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          expect.objectContaining({
            dedupe_key: "order:order-1:disputed-under_review",
          }),
        ],
      }),
    );
  });

  it("never throws when notification storage fails", async () => {
    const tx = writer();
    tx.notification.createMany.mockRejectedValueOnce(new Error("database down"));

    await expect(
      emitOrderNotifications(tx, {
        orderId: "order-1",
        event: "ready",
        recipients: [
          { userId: "buyer-1", title: "Ready", href: "/orders/order-1" },
        ],
      }),
    ).resolves.toBeUndefined();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const { sqlMock } = vi.hoisted(() => ({ sqlMock: vi.fn(async () => []) }));

vi.mock("@/lib/db/context", () => ({
  withUserContext: async (_actor: unknown, work: (tx: unknown) => unknown) =>
    work({ $executeRaw: sqlMock }),
}));

import {
  emitAccountEventNotification,
  emitNewMessageNotification,
  emitSaleStatusNotification,
} from "@/features/notifications/emit";

const actor = { id: "actor-1", admin_role: null } as const;

beforeEach(() => {
  sqlMock.mockClear();
  sqlMock.mockResolvedValue([]);
});

describe("notification emit helpers", () => {
  it("asks the database to notify the other party of a message", async () => {
    await emitNewMessageNotification(actor, "inq-1", "msg-1");
    expect(sqlMock).toHaveBeenCalledTimes(1);
  });

  it("asks the database to notify a sale's buyer", async () => {
    await emitSaleStatusNotification(actor, "sale-1");
    expect(sqlMock).toHaveBeenCalledTimes(1);
  });

  it("records an account event for the acting user", async () => {
    await emitAccountEventNotification(actor, "account_email_change");
    expect(sqlMock).toHaveBeenCalledTimes(1);
  });

  it("never throws when delivery fails — a notice must not break the action", async () => {
    sqlMock.mockRejectedValue(new Error("network down"));
    await expect(
      emitNewMessageNotification(actor, "i", "m"),
    ).resolves.toBeUndefined();
    await expect(
      emitSaleStatusNotification(actor, "s"),
    ).resolves.toBeUndefined();
    await expect(
      emitAccountEventNotification(actor, "account_email_change"),
    ).resolves.toBeUndefined();
  });
});

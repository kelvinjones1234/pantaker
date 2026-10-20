import { afterEach, describe, expect, it, vi } from "vitest";

const { requireUserMock, revalidateMock, prismaMock } = vi.hoisted(() => ({
  requireUserMock: vi.fn(async (_next?: string) => ({
    id: "user-1",
    email: "user@example.com",
  })),
  revalidateMock: vi.fn(),
  prismaMock: {
    notification: { updateMany: vi.fn(async () => ({ count: 1 })) },
    notificationPreference: { upsert: vi.fn(async () => ({})) },
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: revalidateMock }));
vi.mock("@/features/auth/authorization", () => ({
  requireUserForAction: (next?: string) => requireUserMock(next),
}));
vi.mock("@/lib/prisma", () => ({
  getPrisma: () => prismaMock,
  isPrismaConfigured: () => true,
}));

import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
  updateNotificationPreferencesAction,
} from "@/features/notifications/actions";

function formData(entries: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

afterEach(() => {
  vi.clearAllMocks();
  requireUserMock.mockResolvedValue({
    id: "user-1",
    email: "user@example.com",
  });
});

describe("markNotificationReadAction", () => {
  it("redirects an anonymous caller before any query", async () => {
    requireUserMock.mockImplementationOnce(async () => {
      throw new Error("NEXT_REDIRECT:/login");
    });
    await expect(markNotificationReadAction("n-1")).rejects.toThrow(
      "NEXT_REDIRECT",
    );
    expect(prismaMock.notification.updateMany).not.toHaveBeenCalled();
  });

  it("updates only the caller's still-unread row", async () => {
    const res = await markNotificationReadAction("n-1");
    expect(res.ok).toBe(true);
    expect(prismaMock.notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "n-1", user_id: "user-1", read_at: null },
      }),
    );
  });

  it("reports a database failure", async () => {
    prismaMock.notification.updateMany.mockRejectedValueOnce(new Error("nope"));
    const res = await markNotificationReadAction("n-1");
    expect(res.ok).toBe(false);
  });
});

describe("markAllNotificationsReadAction", () => {
  it("marks every unread row for the session user", async () => {
    const res = await markAllNotificationsReadAction();
    expect(res.ok).toBe(true);
    expect(prismaMock.notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { user_id: "user-1", read_at: null } }),
    );
  });
});

describe("updateNotificationPreferencesAction", () => {
  it("saves the session user's preference row", async () => {
    const res = await updateNotificationPreferencesAction(
      formData({ messages: "on", listing_updates: "on" }),
    );
    expect(res.ok).toBe(true);
    expect(prismaMock.notificationPreference.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { user_id: "user-1" },
        create: expect.objectContaining({
          user_id: "user-1",
          messages: true,
          sale_updates: false,
          listing_updates: true,
        }),
      }),
    );
  });

  it("reports a save failure", async () => {
    prismaMock.notificationPreference.upsert.mockRejectedValueOnce(
      new Error("nope"),
    );
    const res = await updateNotificationPreferencesAction(
      formData({ messages: "on" }),
    );
    expect(res.ok).toBe(false);
  });
});

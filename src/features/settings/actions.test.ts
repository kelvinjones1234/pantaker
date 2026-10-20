import { afterEach, describe, expect, it, vi } from "vitest";

const {
  redirectMock,
  prismaMock,
  requireUserMock,
  signOutMock,
  sendEmailMock,
  deleteMock,
} = vi.hoisted(() => ({
  redirectMock: vi.fn((path: string): never => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
  prismaMock: {
    profile: { upsert: vi.fn(async () => ({})) },
    user: { findUnique: vi.fn(async () => null) },
    emailChangeRequest: {
      create: vi.fn(async () => ({ id: "req-1" })),
      updateMany: vi.fn(async () => ({ count: 0 })),
      findUnique: vi.fn(async () => null),
      update: vi.fn(async () => ({})),
    },
    notification: { create: vi.fn(async () => ({})) },
    $transaction: vi.fn(async (ops: unknown[]) => Promise.all(ops)),
  } as any,
  requireUserMock: vi.fn(async (_next?: string) => ({
    id: "seller-a",
    email: "a@example.com",
  })),
  signOutMock: vi.fn(async () => undefined),
  sendEmailMock: vi.fn(async () => undefined),
  deleteMock: vi.fn(async () => ({ ok: true as const })),
}));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => redirectMock(path),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/auth", () => ({ signOut: signOutMock }));
vi.mock("@/features/auth/authorization", () => ({
  requireUserForAction: (next?: string) => requireUserMock(next),
}));
vi.mock("@/features/accounts/deletion", () => ({
  deleteAccountCompletely: deleteMock,
}));
vi.mock("@/lib/auth/email", () => ({
  sendEmailChangeEmail: sendEmailMock,
}));
vi.mock("@/lib/prisma", () => ({
  getPrisma: () => prismaMock,
  isPrismaConfigured: () => true,
}));

import {
  changeEmailAction,
  requestAccountDeletionAction,
  updateListingPreferencesAction,
} from "@/features/settings/actions";

function formData(entries: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

afterEach(() => {
  vi.clearAllMocks();
  requireUserMock.mockResolvedValue({ id: "seller-a", email: "a@example.com" });
  prismaMock.user.findUnique.mockResolvedValue(null);
  deleteMock.mockResolvedValue({ ok: true });
});

describe("changeEmailAction", () => {
  it("rejects an unchanged address without writing", async () => {
    const result = await changeEmailAction(
      formData({ email: "a@example.com" }),
    );
    expect(result.ok).toBe(false);
    expect(prismaMock.emailChangeRequest.create).not.toHaveBeenCalled();
  });

  it("records a request and emails the new address", async () => {
    const result = await changeEmailAction(
      formData({ email: "new@example.com" }),
    );
    expect(result.ok).toBe(true);
    expect(prismaMock.emailChangeRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          user_id: "seller-a",
          new_email: "new@example.com",
        }),
      }),
    );
    expect(prismaMock.notification.create).toHaveBeenCalled();
    expect(sendEmailMock).toHaveBeenCalledWith(
      "new@example.com",
      expect.stringContaining("/seller/settings/account/confirm-email?token="),
    );
  });

  it("refuses an email that already belongs to another account", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: "someone-else" });
    const result = await changeEmailAction(
      formData({ email: "taken@example.com" }),
    );
    expect(result.ok).toBe(false);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });
});

describe("updateListingPreferencesAction", () => {
  it("redirects an anonymous caller before touching the database", async () => {
    requireUserMock.mockImplementationOnce(async () => {
      throw new Error("NEXT_REDIRECT:/login");
    });

    await expect(
      updateListingPreferencesAction(formData({ default_area: "Apo" })),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(prismaMock.profile.upsert).not.toHaveBeenCalled();
  });

  it("rejects an invalid district without writing", async () => {
    const result = await updateListingPreferencesAction(
      formData({ default_area: "Lagos" }),
    );
    expect(result.ok).toBe(false);
    expect(prismaMock.profile.upsert).not.toHaveBeenCalled();
  });

  it("writes only the preference columns for the session user", async () => {
    const result = await updateListingPreferencesAction(
      formData({
        default_area: "Apo",
        default_pickup_notes: "Workshop pickup",
      }),
    );

    expect(result).toEqual({ ok: true, message: "Listing preferences saved." });
    expect(prismaMock.profile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "seller-a" },
        update: {
          default_area: "Apo",
          default_pickup_notes: "Workshop pickup",
        },
      }),
    );
  });
});

describe("requestAccountDeletionAction", () => {
  it("refuses without the exact confirmation phrase", async () => {
    const result = await requestAccountDeletionAction(
      formData({ confirm: "nope" }),
    );
    expect(result.ok).toBe(false);
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("deletes immediately and signs the seller out", async () => {
    await expect(
      requestAccountDeletionAction(formData({ confirm: "DELETE" })),
    ).resolves.toEqual({ ok: true });

    expect(deleteMock).toHaveBeenCalledWith("seller-a", "seller-a");
    expect(signOutMock).toHaveBeenCalledWith({
      redirectTo: "/?account=deleted",
    });
  });
});

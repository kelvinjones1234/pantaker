import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AccountDirectoryUser } from "@/features/admin/account-rules";

const {
  guardMock,
  revalidateMock,
  configured,
  directoryMock,
  rpcMock,
  StorageError,
  holder,
} = vi.hoisted(() => {
  class StorageError extends Error {
    readonly code?: string;
    constructor(message: string, code?: string) {
      super(message);
      this.name = "AccountStorageError";
      this.code = code;
    }
  }
  return {
    guardMock: vi.fn(async (_permission: string) => ({
      id: "admin-1",
      email: "admin@example.com",
      admin_role: "super_admin",
    })),
    revalidateMock: vi.fn(),
    configured: { value: true },
    directoryMock: vi.fn(),
    rpcMock: vi.fn(async (_input: unknown) => undefined),
    StorageError,
    holder: { users: [] as AccountDirectoryUser[] },
  };
});

vi.mock("next/cache", () => ({ revalidatePath: revalidateMock }));
vi.mock("@/features/admin/authorization", () => ({
  requireAdminPermissionForAction: (permission: string) =>
    guardMock(permission),
}));
vi.mock("@/lib/prisma", () => ({
  isPrismaConfigured: () => configured.value,
}));
vi.mock("@/features/admin/account-queries", () => ({
  AccountStorageError: StorageError,
  readAccountDirectory: () => directoryMock(),
  setAccountStatusRpc: (input: unknown) => rpcMock(input),
}));

import {
  setAccountStatusAction,
  type AccountActionResult,
} from "@/features/admin/account-actions";

const TARGET_ID = "9c8b7a65-4d3e-4f2a-8b1c-0d9e8f7a6b5c";
const REASON = "Repeated spam after warnings";

function formData(entries: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

function errorOf(result: AccountActionResult): string | undefined {
  return result.ok ? undefined : result.error;
}

function makeUser(
  overrides: Partial<AccountDirectoryUser> = {},
): AccountDirectoryUser {
  return {
    id: TARGET_ID,
    email: "target@example.com",
    created_at: "2026-01-01T00:00:00Z",
    last_sign_in_at: null,
    banned_until: null,
    role: null,
    ...overrides,
  };
}

beforeEach(() => {
  configured.value = true;
  holder.users = [makeUser()];
  directoryMock.mockImplementation(async () => {
    const map = new Map<string, AccountDirectoryUser>();
    for (const user of holder.users) map.set(user.id, user);
    return map;
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("setAccountStatusAction", () => {
  it("propagates the admin guard failure", async () => {
    guardMock.mockImplementationOnce(async () => {
      throw new Error("AdminAuthorizationError");
    });

    await expect(
      setAccountStatusAction(
        formData({ user_id: TARGET_ID, status: "suspended", reason: REASON }),
      ),
    ).rejects.toThrow("AdminAuthorizationError");
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("refuses when the database is not configured", async () => {
    configured.value = false;

    const result = await setAccountStatusAction(
      formData({ user_id: TARGET_ID, status: "suspended", reason: REASON }),
    );
    expect(result.ok).toBe(false);
    expect(errorOf(result)).toMatch(/database/i);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("rejects malformed input before touching the database", async () => {
    const result = await setAccountStatusAction(
      formData({ user_id: "nope", status: "banned", reason: "x" }),
    );
    expect(result.ok).toBe(false);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("refuses an unknown account", async () => {
    holder.users = [];
    const result = await setAccountStatusAction(
      formData({ user_id: TARGET_ID, status: "restricted", reason: REASON }),
    );
    expect(result.ok).toBe(false);
    expect(errorOf(result)).toMatch(/no longer exists/i);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("refuses to change the acting admin's own status", async () => {
    guardMock.mockResolvedValueOnce({
      id: TARGET_ID,
      email: "admin@example.com",
      admin_role: "super_admin",
    });
    const result = await setAccountStatusAction(
      formData({ user_id: TARGET_ID, status: "suspended", reason: REASON }),
    );
    expect(result.ok).toBe(false);
    expect(errorOf(result)).toMatch(/your own/i);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("refuses to suspend the last super admin", async () => {
    holder.users = [
      makeUser({ id: TARGET_ID, role: "super_admin" }),
      makeUser({ id: "admin-2", role: "moderator" }),
    ];
    guardMock.mockResolvedValueOnce({
      id: "admin-2",
      email: "mod@example.com",
      admin_role: "moderator",
    });

    const result = await setAccountStatusAction(
      formData({ user_id: TARGET_ID, status: "suspended", reason: REASON }),
    );
    expect(result.ok).toBe(false);
    expect(errorOf(result)).toMatch(/super admin/i);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("suspends by recording the restriction", async () => {
    const result = await setAccountStatusAction(
      formData({ user_id: TARGET_ID, status: "suspended", reason: REASON }),
    );
    expect(result).toMatchObject({ ok: true });
    expect(rpcMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: TARGET_ID,
        status: "suspended",
        reason: REASON,
      }),
    );
    expect(revalidateMock).toHaveBeenCalledWith("/admin/accounts");
  });

  it("restricts by recording the restriction", async () => {
    const result = await setAccountStatusAction(
      formData({ user_id: TARGET_ID, status: "restricted", reason: REASON }),
    );
    expect(result).toMatchObject({ ok: true });
    expect(rpcMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: TARGET_ID,
        status: "restricted",
        reason: REASON,
      }),
    );
  });

  it("restores by clearing the restriction", async () => {
    const result = await setAccountStatusAction(
      formData({ user_id: TARGET_ID, status: "active", reason: REASON }),
    );
    expect(result).toMatchObject({ ok: true });
    expect(rpcMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: TARGET_ID,
        status: "active",
        reason: REASON,
      }),
    );
  });

  it("maps storage failures to friendly messages", async () => {
    rpcMock.mockRejectedValueOnce(new StorageError("last_super_admin"));
    const result = await setAccountStatusAction(
      formData({ user_id: TARGET_ID, status: "suspended", reason: REASON }),
    );
    expect(result.ok).toBe(false);
    expect(errorOf(result)).toMatch(/super admin/i);
  });

  it("surfaces an unexpected write failure", async () => {
    rpcMock.mockRejectedValueOnce(new StorageError("boom"));
    const result = await setAccountStatusAction(
      formData({ user_id: TARGET_ID, status: "suspended", reason: REASON }),
    );
    expect(result.ok).toBe(false);
    expect(errorOf(result)).toMatch(/could not update/i);
  });
});

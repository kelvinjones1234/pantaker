import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getAuthUserMock, prismaMock, configured } = vi.hoisted(() => ({
  getAuthUserMock: vi.fn(async () => ({ id: "user-1" })),
  prismaMock: {
    accountRestriction: { findUnique: vi.fn() },
  },
  configured: { value: true },
}));

vi.mock("@/features/auth/queries", () => ({
  getAuthUser: () => getAuthUserMock(),
}));
vi.mock("@/lib/prisma", () => ({
  getPrisma: () => prismaMock,
  isPrismaConfigured: () => configured.value,
}));

import {
  evaluateAccountWriteAccess,
  loadAccountAccessState,
  type AccountAccessResult,
} from "@/features/accounts/access";

beforeEach(() => {
  configured.value = true;
  getAuthUserMock.mockResolvedValue({ id: "user-1" });
  prismaMock.accountRestriction.findUnique.mockReset();
  prismaMock.accountRestriction.findUnique.mockResolvedValue(null);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("loadAccountAccessState", () => {
  it("treats an unconfigured database as active", async () => {
    configured.value = false;
    await expect(loadAccountAccessState()).resolves.toEqual({ status: "active", endsAt: null });
    expect(prismaMock.accountRestriction.findUnique).not.toHaveBeenCalled();
  });

  it("reads a restricted state from the account restriction row", async () => {
    prismaMock.accountRestriction.findUnique.mockResolvedValue({
      status: "restricted",
      ends_at: new Date("2026-01-01T00:00:00Z"),
    });

    await expect(loadAccountAccessState()).resolves.toEqual({
      status: "restricted",
      endsAt: "2026-01-01T00:00:00.000Z",
    });
  });

  it("reads a suspended state", async () => {
    prismaMock.accountRestriction.findUnique.mockResolvedValue({
      status: "suspended",
      ends_at: null,
    });

    await expect(loadAccountAccessState()).resolves.toMatchObject({ status: "suspended" });
  });

  it("returns unknown for a genuine lookup failure", async () => {
    prismaMock.accountRestriction.findUnique.mockRejectedValue(new Error("timeout"));
    await expect(loadAccountAccessState()).resolves.toMatchObject({ status: "unknown" });
  });
});

describe("evaluateAccountWriteAccess", () => {
  const check = (state: AccountAccessResult) => evaluateAccountWriteAccess(state);

  it("allows an active account", () => {
    expect(check({ status: "active", endsAt: null })).toEqual({ ok: true });
  });

  it("denies a restricted account with a specific message", () => {
    const result = check({ status: "restricted", endsAt: null });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/restricted/i);
  });

  it("denies a suspended account with a specific message", () => {
    const result = check({ status: "suspended", endsAt: null });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/suspended/i);
  });

  it("fails closed when access cannot be verified", () => {
    const result = check({ status: "unknown", error: "Could not check." });
    expect(result).toEqual({ ok: false, error: "Could not check." });
  });
});

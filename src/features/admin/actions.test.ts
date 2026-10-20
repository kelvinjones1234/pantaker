import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { guardMock, revalidateMock, prismaMock, configured, holder } =
  vi.hoisted(() => ({
    guardMock: vi.fn(async (_permission: string) => ({
      id: "admin-1",
      email: "admin@example.com",
      admin_role: "super_admin",
    })),
    revalidateMock: vi.fn(),
    configured: { value: true },
    holder: {
      users: [] as Array<{ id: string; admin_role: string | null }>,
      updates: [] as Array<{ id: string; data: unknown }>,
      audits: [] as unknown[],
      readError: null as unknown,
      writeError: null as unknown,
    },
    prismaMock: {
      user: {
        findMany: vi.fn(async () => holder.users),
      },
    },
  }));

vi.mock("next/cache", () => ({ revalidatePath: revalidateMock }));
vi.mock("@/features/admin/authorization", () => ({
  requireAdminPermissionForAction: (permission: string) =>
    guardMock(permission),
}));
vi.mock("@/lib/prisma", () => ({
  getPrisma: () => prismaMock,
  isPrismaConfigured: () => configured.value,
}));
vi.mock("@/lib/db/context", () => ({
  withUserContext: async (_actor: unknown, work: (tx: unknown) => unknown) =>
    work({
      user: {
        update: async (args: { where: { id: string }; data: unknown }) => {
          if (holder.writeError) throw holder.writeError;
          holder.updates.push({ id: args.where.id, data: args.data });
        },
      },
      adminAuditEvent: {
        create: async (args: unknown) => {
          holder.audits.push(args);
        },
      },
    }),
}));

import {
  grantAdminRoleAction,
  revokeAdminRoleAction,
  type AdminActionResult,
} from "@/features/admin/actions";

const TARGET_ID = "9c8b7a65-4d3e-4f2a-8b1c-0d9e8f7a6b5c";

function formData(entries: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

function errorOf(result: AdminActionResult): string | undefined {
  return result.ok ? undefined : result.error;
}

beforeEach(() => {
  configured.value = true;
  holder.users = [];
  holder.updates = [];
  holder.audits = [];
  holder.readError = null;
  holder.writeError = null;
  prismaMock.user.findMany.mockImplementation(async () => {
    if (holder.readError) throw holder.readError;
    return holder.users;
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("grantAdminRoleAction", () => {
  it("redirects an anonymous caller before touching the database", async () => {
    guardMock.mockImplementationOnce(async () => {
      throw new Error("NEXT_REDIRECT:/login");
    });

    await expect(
      grantAdminRoleAction(formData({ user_id: TARGET_ID, role: "moderator" })),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(holder.updates).toHaveLength(0);
  });

  it("throws for an admin without the manage-admins permission (moderator)", async () => {
    guardMock.mockImplementationOnce(async () => {
      throw new Error("AdminAuthorizationError");
    });

    await expect(
      grantAdminRoleAction(formData({ user_id: TARGET_ID, role: "moderator" })),
    ).rejects.toThrow("AdminAuthorizationError");
    expect(holder.updates).toHaveLength(0);
  });

  it("refuses when the database is not configured", async () => {
    configured.value = false;

    const result = await grantAdminRoleAction(
      formData({ user_id: TARGET_ID, role: "moderator" }),
    );
    expect(result.ok).toBe(false);
    expect(errorOf(result)).toMatch(/database/i);
  });

  it("rejects malformed input before any write", async () => {
    const result = await grantAdminRoleAction(
      formData({ user_id: "nope", role: "owner" }),
    );
    expect(result.ok).toBe(false);
    expect(holder.updates).toHaveLength(0);
  });

  it("promotes an ordinary account to moderator", async () => {
    holder.users = [{ id: TARGET_ID, admin_role: null }];

    const result = await grantAdminRoleAction(
      formData({ user_id: TARGET_ID, role: "moderator" }),
    );
    expect(result).toMatchObject({ ok: true });
    expect(holder.updates[0]).toMatchObject({
      id: TARGET_ID,
      data: { admin_role: "moderator", session_version: { increment: 1 } },
    });
    expect(holder.audits).toHaveLength(1);
    expect(revalidateMock).toHaveBeenCalledWith("/admin");
  });

  it("refuses to demote the only remaining super admin", async () => {
    holder.users = [{ id: TARGET_ID, admin_role: "super_admin" }];

    const result = await grantAdminRoleAction(
      formData({ user_id: TARGET_ID, role: "moderator" }),
    );
    expect(result.ok).toBe(false);
    expect(errorOf(result)).toMatch(/super admin/i);
    expect(holder.updates).toHaveLength(0);
  });

  it("counts the legacy 'admin' claim as a super admin for the last-admin check", async () => {
    holder.users = [{ id: TARGET_ID, admin_role: "admin" }];

    const result = await grantAdminRoleAction(
      formData({ user_id: TARGET_ID, role: "moderator" }),
    );
    expect(result.ok).toBe(false);
    expect(holder.updates).toHaveLength(0);
  });

  it("allows demoting a super admin when another super admin remains", async () => {
    holder.users = [
      { id: TARGET_ID, admin_role: "super_admin" },
      { id: "other-admin", admin_role: "super_admin" },
    ];

    const result = await grantAdminRoleAction(
      formData({ user_id: TARGET_ID, role: "moderator" }),
    );
    expect(result).toMatchObject({ ok: true });
    expect(holder.updates[0]?.data).toMatchObject({ admin_role: "moderator" });
  });

  it("surfaces a directory read failure without writing", async () => {
    holder.readError = new Error("boom");

    const result = await grantAdminRoleAction(
      formData({ user_id: TARGET_ID, role: "moderator" }),
    );
    expect(result.ok).toBe(false);
    expect(holder.updates).toHaveLength(0);
  });

  it("surfaces a write failure", async () => {
    holder.users = [{ id: TARGET_ID, admin_role: null }];
    holder.writeError = new Error("nope");

    const result = await grantAdminRoleAction(
      formData({ user_id: TARGET_ID, role: "moderator" }),
    );
    expect(result.ok).toBe(false);
    expect(errorOf(result)).toMatch(/try again/i);
  });
});

describe("revokeAdminRoleAction", () => {
  it("throws for an admin without the manage-admins permission", async () => {
    guardMock.mockImplementationOnce(async () => {
      throw new Error("AdminAuthorizationError");
    });

    await expect(
      revokeAdminRoleAction(formData({ user_id: TARGET_ID })),
    ).rejects.toThrow("AdminAuthorizationError");
    expect(holder.updates).toHaveLength(0);
  });

  it("refuses to revoke the only super admin", async () => {
    holder.users = [{ id: TARGET_ID, admin_role: "super_admin" }];

    const result = await revokeAdminRoleAction(
      formData({ user_id: TARGET_ID }),
    );
    expect(result.ok).toBe(false);
    expect(errorOf(result)).toMatch(/super admin/i);
    expect(holder.updates).toHaveLength(0);
  });

  it("revokes a moderator by clearing admin_role", async () => {
    holder.users = [
      { id: TARGET_ID, admin_role: "moderator" },
      { id: "admin-1", admin_role: "super_admin" },
    ];

    const result = await revokeAdminRoleAction(
      formData({ user_id: TARGET_ID }),
    );
    expect(result).toMatchObject({ ok: true });
    expect(holder.updates[0]?.data).toMatchObject({ admin_role: null });
  });

  it("rejects a malformed account id before any write", async () => {
    const result = await revokeAdminRoleAction(formData({ user_id: "nope" }));
    expect(result.ok).toBe(false);
    expect(holder.updates).toHaveLength(0);
  });
});

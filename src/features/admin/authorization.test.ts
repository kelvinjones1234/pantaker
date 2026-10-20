import { afterEach, describe, expect, it, vi } from "vitest";

const { redirectMock, notFoundMock, getUserMock, accessMock } = vi.hoisted(() => ({
  redirectMock: vi.fn((path: string): never => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
  notFoundMock: vi.fn((): never => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  getUserMock: vi.fn(),
  accessMock: vi.fn(async () => ({ status: "active", endsAt: null })),
}));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => redirectMock(path),
  notFound: () => notFoundMock(),
}));

vi.mock("@/features/auth/queries", () => ({
  getAuthUser: () => getUserMock(),
}));
vi.mock("@/features/accounts/access", () => ({
  getAccountAccessState: () => Promise.resolve(accessMock()),
}));

import {
  AdminAuthorizationError,
  getAdminUser,
  isAdminUser,
  requireAdmin,
  requireAdminForAction,
  requireAdminPermission,
  requireAdminPermissionForAction,
} from "@/features/admin/authorization";

type UserLike = Parameters<typeof isAdminUser>[0];

/** Build the shape the guard inspects, plus any extra fields for assertions. */
function makeUser(
  adminRole: string | null,
  extra: Record<string, unknown> = {},
): UserLike {
  return { ...extra, admin_role: adminRole } as unknown as UserLike;
}

const admin = () => makeUser("super_admin", { id: "admin-1", email: "admin@example.com" });
const moderator = () => makeUser("moderator", { id: "mod-1", email: "mod@example.com" });
const ordinary = () => makeUser(null, { id: "user-1", email: "user@example.com" });

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  accessMock.mockResolvedValue({ status: "active", endsAt: null });
});

describe("isAdminUser", () => {
  it("accepts the server-controlled admin role", () => {
    expect(isAdminUser(admin())).toBe(true);
  });

  it("accepts moderator and the legacy admin claim (both are admins)", () => {
    expect(isAdminUser(moderator())).toBe(true);
    expect(isAdminUser(makeUser("ADMIN"))).toBe(true);
  });

  it("rejects a signed-in non-admin", () => {
    expect(isAdminUser(ordinary())).toBe(false);
    expect(isAdminUser(makeUser("owner"))).toBe(false);
    expect(isAdminUser(makeUser("1"))).toBe(false);
  });

  it("rejects a missing user or missing claim", () => {
    expect(isAdminUser(null)).toBe(false);
    expect(isAdminUser(undefined)).toBe(false);
    expect(isAdminUser(makeUser(null))).toBe(false);
  });

  it("only trusts the server-owned admin_role column", () => {
    const spoofed = { id: "u", admin_role: null, user_metadata: { role: "admin" } } as unknown as UserLike;
    expect(isAdminUser(spoofed)).toBe(false);
  });
});

describe("getAdminUser", () => {
  it("returns null for an unauthenticated or non-admin session", async () => {
    getUserMock.mockResolvedValueOnce(null);
    await expect(getAdminUser()).resolves.toBeNull();

    getUserMock.mockResolvedValueOnce(ordinary());
    await expect(getAdminUser()).resolves.toBeNull();
  });

  it("returns the session for an authorized admin", async () => {
    getUserMock.mockResolvedValue(admin());
    await expect(getAdminUser()).resolves.toMatchObject({ id: "admin-1" });
  });
});

describe("requireAdmin", () => {
  it("redirects anonymous visitors to the existing sign-in flow", async () => {
    getUserMock.mockResolvedValue(null);

    await expect(requireAdmin("/admin")).rejects.toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/login?next=%2Fadmin");
    expect(notFoundMock).not.toHaveBeenCalled();
  });

  it("preserves the requested admin path in the sign-in return", async () => {
    getUserMock.mockResolvedValue(null);

    await expect(requireAdmin("/admin/reports")).rejects.toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/login?next=%2Fadmin%2Freports");
  });

  it("does not preview — anonymous access is denied even in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    getUserMock.mockResolvedValue(null);

    await expect(requireAdmin("/admin")).rejects.toThrow("NEXT_REDIRECT");
    expect(notFoundMock).not.toHaveBeenCalled();
  });

  it("hides the surface from a signed-in non-admin with a 404", async () => {
    getUserMock.mockResolvedValue(ordinary());

    await expect(requireAdmin("/admin")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalledTimes(1);
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("treats an auth lookup failure as unauthenticated", async () => {
    getUserMock.mockRejectedValue(new Error("network"));

    await expect(requireAdmin("/admin")).rejects.toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/login?next=%2Fadmin");
  });

  it("returns the admin for an authorized session", async () => {
    getUserMock.mockResolvedValue(admin());

    await expect(requireAdmin("/admin")).resolves.toMatchObject({ id: "admin-1" });
    expect(redirectMock).not.toHaveBeenCalled();
    expect(notFoundMock).not.toHaveBeenCalled();
  });

  it("lets any admin role in (moderators reach the admin area)", async () => {
    getUserMock.mockResolvedValue(moderator());

    await expect(requireAdmin("/admin")).resolves.toMatchObject({ id: "mod-1" });
  });

  it("redirects a suspended admin session to the suspension notice", async () => {
    getUserMock.mockResolvedValue(admin());
    accessMock.mockResolvedValueOnce({ status: "suspended", endsAt: null });

    await expect(requireAdmin("/admin")).rejects.toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/account-suspended");
  });
});

describe("requireAdminPermission", () => {
  it("redirects anonymous visitors and keeps the requested path", async () => {
    getUserMock.mockResolvedValue(null);

    await expect(
      requireAdminPermission("listings.review", "/admin/listings"),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/login?next=%2Fadmin%2Flistings");
  });

  it("404s a signed-in non-admin", async () => {
    getUserMock.mockResolvedValue(ordinary());

    await expect(requireAdminPermission("listings.review")).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("404s an admin whose role lacks the permission", async () => {
    getUserMock.mockResolvedValue(moderator());

    await expect(requireAdminPermission("admins.manage")).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("allows an admin whose role grants the permission", async () => {
    getUserMock.mockResolvedValue(moderator());

    await expect(requireAdminPermission("listings.review")).resolves.toMatchObject({
      id: "mod-1",
    });
    expect(notFoundMock).not.toHaveBeenCalled();
  });
});

describe("requireAdminForAction", () => {
  it("redirects anonymous callers to sign in and never previews", async () => {
    vi.stubEnv("NODE_ENV", "development");
    getUserMock.mockResolvedValue(null);

    await expect(requireAdminForAction()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/login?next=%2Fadmin");
  });

  it("throws for a signed-in non-admin instead of rendering or redirecting", async () => {
    getUserMock.mockResolvedValue(ordinary());

    await expect(requireAdminForAction()).rejects.toBeInstanceOf(AdminAuthorizationError);
    expect(redirectMock).not.toHaveBeenCalled();
    expect(notFoundMock).not.toHaveBeenCalled();
  });

  it("returns the admin for an authorized session", async () => {
    getUserMock.mockResolvedValue(admin());

    await expect(requireAdminForAction()).resolves.toMatchObject({ id: "admin-1" });
  });
});

describe("requireAdminPermissionForAction", () => {
  it("redirects anonymous callers to sign in", async () => {
    getUserMock.mockResolvedValue(null);

    await expect(requireAdminPermissionForAction("admins.manage")).rejects.toThrow(
      "NEXT_REDIRECT",
    );
    expect(redirectMock).toHaveBeenCalledWith("/login?next=%2Fadmin");
  });

  it("throws (and records the permission) when the role lacks it", async () => {
    getUserMock.mockResolvedValue(moderator());

    const error = await requireAdminPermissionForAction("admins.manage").catch(
      (thrown: unknown) => thrown,
    );
    expect(error).toBeInstanceOf(AdminAuthorizationError);
    expect((error as AdminAuthorizationError).permission).toBe("admins.manage");
  });

  it("throws for a signed-in non-admin", async () => {
    getUserMock.mockResolvedValue(ordinary());

    await expect(
      requireAdminPermissionForAction("listings.review"),
    ).rejects.toBeInstanceOf(AdminAuthorizationError);
  });

  it("returns the admin when the role grants the permission", async () => {
    getUserMock.mockResolvedValue(admin());

    await expect(requireAdminPermissionForAction("admins.manage")).resolves.toMatchObject({
      id: "admin-1",
    });
  });
});

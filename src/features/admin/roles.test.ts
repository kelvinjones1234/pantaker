import { describe, expect, it } from "vitest";
import {
  ADMIN_PERMISSIONS,
  ADMIN_ROLE_LABELS,
  ADMIN_ROLES,
  getAdminRole,
  hasAdminPermission,
  isAdminUser,
  NO_ADMIN_ROLE,
  normalizeAdminRole,
  permissionsForRole,
  type AdminPermission,
  type AdminRole,
} from "@/features/admin/roles";

type UserLike = Parameters<typeof isAdminUser>[0];

function makeUser(
  adminRole: string | null,
  extra: Record<string, unknown> = {},
): UserLike {
  return { ...extra, admin_role: adminRole } as unknown as UserLike;
}

describe("normalizeAdminRole", () => {
  it("accepts both canonical roles", () => {
    expect(normalizeAdminRole("super_admin")).toBe("super_admin");
    expect(normalizeAdminRole("moderator")).toBe("moderator");
  });

  it("treats the legacy 'admin' claim as super_admin (backward compatible)", () => {
    expect(normalizeAdminRole("admin")).toBe("super_admin");
  });

  it("is case- and whitespace-insensitive", () => {
    expect(normalizeAdminRole("  ADMIN ")).toBe("super_admin");
    expect(normalizeAdminRole("Moderator")).toBe("moderator");
  });

  it("rejects unknown, revoked, empty and non-string values", () => {
    expect(normalizeAdminRole(NO_ADMIN_ROLE)).toBeNull();
    expect(normalizeAdminRole("owner")).toBeNull();
    expect(normalizeAdminRole("")).toBeNull();
    expect(normalizeAdminRole(null)).toBeNull();
    expect(normalizeAdminRole(1)).toBeNull();
    expect(normalizeAdminRole(undefined)).toBeNull();
  });

  it("keeps the advertised role list in step with the labels", () => {
    expect(ADMIN_ROLES).toEqual(["super_admin", "moderator"]);
    expect(Object.keys(ADMIN_ROLE_LABELS).sort()).toEqual([...ADMIN_ROLES].sort());
  });
});

describe("getAdminRole", () => {
  it("reads the server-controlled claim", () => {
    expect(getAdminRole(makeUser("moderator"))).toBe("moderator");
    expect(getAdminRole(makeUser("admin"))).toBe("super_admin");
  });

  it("returns null for a missing user or missing claim", () => {
    expect(getAdminRole(null)).toBeNull();
    expect(getAdminRole(undefined)).toBeNull();
    expect(getAdminRole(makeUser(null))).toBeNull();
  });

  it("never trusts the user-editable user_metadata claim", () => {
    const spoofed = { id: "u", admin_role: null, user_metadata: { role: "super_admin" } } as unknown as UserLike;
    expect(getAdminRole(spoofed)).toBeNull();
    expect(isAdminUser(spoofed)).toBe(false);
  });
});

describe("isAdminUser", () => {
  it("accepts any recognized admin role", () => {
    expect(isAdminUser(makeUser("super_admin"))).toBe(true);
    expect(isAdminUser(makeUser("moderator"))).toBe(true);
    expect(isAdminUser(makeUser("admin"))).toBe(true);
  });

  it("rejects non-admins", () => {
    expect(isAdminUser(makeUser(null))).toBe(false);
    expect(isAdminUser(makeUser("1"))).toBe(false);
    expect(isAdminUser(null)).toBe(false);
  });
});

describe("permissionsForRole", () => {
  it("gives super_admin every permission and moderator a strict subset", () => {
    expect(permissionsForRole("super_admin")).toEqual(ADMIN_PERMISSIONS);
    const moderator = permissionsForRole("moderator");
    expect(moderator).not.toContain("admins.manage");
    expect(moderator).not.toContain("users.manage");
    expect(moderator).toContain("listings.review");
    for (const permission of moderator) {
      expect(ADMIN_PERMISSIONS).toContain(permission);
    }
  });

  it("grants nothing without a role", () => {
    expect(permissionsForRole(null)).toEqual([]);
  });
});

describe("hasAdminPermission", () => {
  const cases: Array<[AdminRole, AdminPermission, boolean]> = [
    ["super_admin", "listings.review", true],
    ["super_admin", "reports.manage", true],
    ["super_admin", "users.manage", true],
    ["super_admin", "admins.manage", true],
    ["moderator", "listings.review", true],
    ["moderator", "reports.manage", true],
    ["moderator", "users.view", true],
    ["moderator", "analytics.view", true],
    ["moderator", "users.manage", false],
    ["moderator", "admins.manage", false],
  ];

  it.each(cases)("%s + %s -> %s", (role, permission, expected) => {
    expect(hasAdminPermission(makeUser(role), permission)).toBe(expected);
  });

  it("denies every permission to non-admins", () => {
    const ordinary = makeUser(null);
    for (const permission of ADMIN_PERMISSIONS) {
      expect(hasAdminPermission(ordinary, permission)).toBe(false);
    }
    expect(hasAdminPermission(null, "listings.review")).toBe(false);
  });

  it("treats the legacy admin claim as full super_admin access", () => {
    for (const permission of ADMIN_PERMISSIONS) {
      expect(hasAdminPermission(makeUser("admin"), permission)).toBe(true);
    }
  });
});

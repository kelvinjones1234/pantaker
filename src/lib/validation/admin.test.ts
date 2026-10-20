import { describe, expect, it } from "vitest";
import {
  adminRoleSchema,
  grantAdminRoleSchema,
  revokeAdminRoleSchema,
} from "@/lib/validation/admin";
import { ADMIN_ROLES } from "@/features/admin/roles";

const USER_ID = "9c8b7a65-4d3e-4f2a-8b1c-0d9e8f7a6b5c";

describe("adminRoleSchema", () => {
  it("accepts exactly the canonical admin roles", () => {
    for (const role of ADMIN_ROLES) {
      expect(adminRoleSchema.safeParse(role).success).toBe(true);
    }
  });

  it("rejects the legacy 'admin', junk, and non-strings", () => {
    expect(adminRoleSchema.safeParse("admin").success).toBe(false);
    expect(adminRoleSchema.safeParse("owner").success).toBe(false);
    expect(adminRoleSchema.safeParse("").success).toBe(false);
    expect(adminRoleSchema.safeParse(1).success).toBe(false);
    expect(adminRoleSchema.safeParse(undefined).success).toBe(false);
  });
});

describe("grantAdminRoleSchema", () => {
  it("accepts a valid account and role", () => {
    const parsed = grantAdminRoleSchema.parse({ user_id: USER_ID, role: "moderator" });
    expect(parsed).toEqual({ user_id: USER_ID, role: "moderator" });
  });

  it("rejects a non-uuid account or an unknown role", () => {
    expect(
      grantAdminRoleSchema.safeParse({ user_id: "not-a-uuid", role: "moderator" }).success,
    ).toBe(false);
    expect(grantAdminRoleSchema.safeParse({ user_id: USER_ID, role: "admin" }).success).toBe(
      false,
    );
    expect(grantAdminRoleSchema.safeParse({ user_id: USER_ID }).success).toBe(false);
  });
});

describe("revokeAdminRoleSchema", () => {
  it("requires only a valid account id", () => {
    expect(revokeAdminRoleSchema.parse({ user_id: USER_ID })).toEqual({ user_id: USER_ID });
    expect(revokeAdminRoleSchema.safeParse({ user_id: "nope" }).success).toBe(false);
  });
});

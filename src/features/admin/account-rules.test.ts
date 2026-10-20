import { describe, expect, it } from "vitest";
import {
  buildAccountRows,
  countAccountStatuses,
  evaluateAccountStatusChange,
  filterAccountRows,
  isAccountBanned,
  paginateAccountRows,
  resolveAccountStatus,
  type AccountDirectoryUser,
  type AccountRestrictionRecord,
} from "@/features/admin/account-rules";

const NOW = new Date("2026-06-01T12:00:00Z");

function restriction(
  overrides: Partial<AccountRestrictionRecord> = {},
): AccountRestrictionRecord {
  return {
    user_id: "user-1",
    status: "restricted",
    reason: "Repeated spam listings",
    starts_at: "2026-05-01T10:00:00Z",
    ends_at: null,
    created_by: "admin-1",
    updated_by: "admin-1",
    created_at: "2026-05-01T10:00:00Z",
    updated_at: "2026-05-01T10:00:00Z",
    ...overrides,
  };
}

function user(overrides: Partial<AccountDirectoryUser> = {}): AccountDirectoryUser {
  return {
    id: "user-1",
    email: "seller@example.com",
    created_at: "2026-01-01T00:00:00Z",
    last_sign_in_at: "2026-05-20T09:00:00Z",
    banned_until: null,
    role: null,
    ...overrides,
  };
}

describe("isAccountBanned", () => {
  it("is true only for a future ban date", () => {
    expect(isAccountBanned("2026-07-01T00:00:00Z", NOW)).toBe(true);
    expect(isAccountBanned("2026-01-01T00:00:00Z", NOW)).toBe(false);
    expect(isAccountBanned(null, NOW)).toBe(false);
    expect(isAccountBanned("not-a-date", NOW)).toBe(false);
  });
});

describe("resolveAccountStatus", () => {
  it("prefers a suspension over a restriction", () => {
    expect(resolveAccountStatus(restriction({ status: "suspended" }), null, NOW)).toBe(
      "suspended",
    );
  });

  it("treats a legacy Auth ban as suspended", () => {
    expect(resolveAccountStatus(null, "2026-07-01T00:00:00Z", NOW)).toBe("suspended");
  });

  it("returns restricted for a restricted row", () => {
    expect(resolveAccountStatus(restriction(), null, NOW)).toBe("restricted");
  });

  it("returns active when neither applies", () => {
    expect(resolveAccountStatus(null, null, NOW)).toBe("active");
  });
});

describe("buildAccountRows", () => {
  const users = [
    user({ id: "admin-1", email: "admin@example.com" }),
    user({ id: "user-1", email: "seller@example.com" }),
    user({ id: "user-2", email: "buyer@example.com", banned_until: "2026-07-01T00:00:00Z" }),
  ];

  it("joins the responsible administrator's email", () => {
    const [row] = buildAccountRows(users, [restriction()], NOW).filter(
      (item) => item.id === "user-1",
    );
    expect(row.status).toBe("restricted");
    expect(row.responsibleAdmin).toEqual({ id: "admin-1", email: "admin@example.com" });
  });

  it("marks a legacy ban without inventing a reason", () => {
    const row = buildAccountRows(users, [], NOW).find((item) => item.id === "user-2");
    expect(row?.status).toBe("suspended");
    expect(row?.restriction).toBeNull();
    expect(row?.legacyBannedUntil).toBe("2026-07-01T00:00:00Z");
  });

  it("sorts suspended, then restricted, then active", () => {
    const rows = buildAccountRows(users, [restriction()], NOW);
    expect(rows.map((row) => row.status)).toEqual(["suspended", "restricted", "active"]);
  });
});

describe("filterAccountRows and pagination", () => {
  const rows = buildAccountRows(
    [
      user({ id: "user-1", email: "seller@example.com" }),
      user({ id: "user-2", email: "buyer@example.com" }),
      user({ id: "user-3", email: "other@example.com" }),
    ],
    [restriction({ user_id: "user-2", status: "suspended" })],
    NOW,
  );

  it("searches email and id, and filters by status", () => {
    expect(filterAccountRows(rows, { q: "buyer", status: "" })).toHaveLength(1);
    expect(filterAccountRows(rows, { q: "user-3", status: "" })).toHaveLength(1);
    expect(filterAccountRows(rows, { q: "", status: "suspended" })).toHaveLength(1);
    expect(filterAccountRows(rows, { q: "", status: "active" })).toHaveLength(2);
  });

  it("counts each status", () => {
    expect(countAccountStatuses(rows)).toEqual({
      all: 3,
      suspended: 1,
      restricted: 0,
      active: 2,
    });
  });

  it("pages rows deterministically", () => {
    expect(paginateAccountRows(rows, 1, 2)).toHaveLength(2);
    expect(paginateAccountRows(rows, 2, 2)).toHaveLength(1);
    expect(paginateAccountRows(rows, 99, 2)).toHaveLength(0);
  });
});

describe("evaluateAccountStatusChange", () => {
  it("blocks changing your own account status", () => {
    const result = evaluateAccountStatusChange({
      actorId: "admin-1",
      targetId: "admin-1",
      targetRole: "super_admin",
      status: "suspended",
      otherSuperAdmins: 2,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/your own/i);
  });

  it("blocks removing the last super admin", () => {
    const result = evaluateAccountStatusChange({
      actorId: "admin-2",
      targetId: "admin-1",
      targetRole: "super_admin",
      status: "restricted",
      otherSuperAdmins: 0,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/super admin/i);
  });

  it("allows acting on a super admin when another remains", () => {
    expect(
      evaluateAccountStatusChange({
        actorId: "admin-2",
        targetId: "admin-1",
        targetRole: "super_admin",
        status: "restricted",
        otherSuperAdmins: 1,
      }),
    ).toEqual({ ok: true });
  });

  it("always allows restoring an account", () => {
    expect(
      evaluateAccountStatusChange({
        actorId: "admin-2",
        targetId: "admin-1",
        targetRole: "super_admin",
        status: "active",
        otherSuperAdmins: 0,
      }),
    ).toEqual({ ok: true });
  });
});

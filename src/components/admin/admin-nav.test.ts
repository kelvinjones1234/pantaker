import { describe, expect, it } from "vitest";
import { adminNavFor, isAdminNavActive } from "@/components/admin/admin-nav";
import type { AdminPermission } from "@/features/admin/roles";

const moderatorPermissions: AdminPermission[] = [
  "listings.review",
  "reports.manage",
  "users.view",
  "analytics.view",
];

describe("adminNavFor", () => {
  it("shows every section to a super admin", () => {
    const hrefs = adminNavFor([
      "listings.review",
      "reports.manage",
      "users.view",
      "users.manage",
      "analytics.view",
      "admins.manage",
    ]).map((item) => item.href);

    expect(hrefs).toContain("/admin/admins");
    expect(hrefs).toContain("/admin/deletion-requests");
    expect(hrefs).toHaveLength(7);
  });

  it("hides permission-gated sections a moderator cannot use", () => {
    const hrefs = adminNavFor(moderatorPermissions).map((item) => item.href);

    expect(hrefs).toContain("/admin");
    expect(hrefs).toContain("/admin/accounts");
    expect(hrefs).not.toContain("/admin/admins");
    expect(hrefs).not.toContain("/admin/deletion-requests");
  });
});

describe("isAdminNavActive", () => {
  it("matches nested routes for section links", () => {
    expect(
      isAdminNavActive("/admin/categories/new", {
        href: "/admin/categories",
      }),
    ).toBe(true);
  });

  it("only matches the exact dashboard route", () => {
    expect(isAdminNavActive("/admin", { href: "/admin", exact: true })).toBe(
      true,
    );
    expect(
      isAdminNavActive("/admin/listings", { href: "/admin", exact: true }),
    ).toBe(false);
  });
});

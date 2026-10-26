import { describe, expect, it } from "vitest";
import {
  SETTINGS_GROUPS,
  isSettingsGroupActive,
} from "@/components/seller/settings-nav";

describe("settings navigation", () => {
  it("keeps a group active on its nested routes", () => {
    expect(
      isSettingsGroupActive(
        "/seller/settings/account/confirm-email",
        "/seller/settings/account",
      ),
    ).toBe(true);
  });

  it("does not activate a sibling group", () => {
    expect(
      isSettingsGroupActive(
        "/seller/settings/security",
        "/seller/settings/account",
      ),
    ).toBe(false);
  });

  it("points the security group at the canonical route", () => {
    const security = SETTINGS_GROUPS.find(
      (group) => group.label === "Security",
    );
    expect(security?.href).toBe("/seller/settings/security");
    expect(
      SETTINGS_GROUPS.some((group) =>
        group.href.includes("account-management"),
      ),
    ).toBe(false);
  });
});

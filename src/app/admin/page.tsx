import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/features/admin/authorization";
import {
  ADMIN_PERMISSION_LABELS,
  ADMIN_ROLE_DESCRIPTIONS,
  ADMIN_ROLE_LABELS,
  getAdminRole,
  permissionsForRole,
  type AdminPermission,
} from "@/features/admin/roles";
import { SellerPageHeader } from "@/components/seller/SellerPageHeader";
import { SettingsCard, SettingsRow } from "@/components/seller/SettingsCard";

export const metadata: Metadata = {
  title: "Admin — Pantaker",
  robots: { index: false, follow: false },
};

/**
 * Every admin tool is added behind a `requireAdminPermission` gate for the
 * permission listed here. Until a tool ships, nothing on this page shows a
 * number or status that is not real — no fabricated moderation counts or
 * platform metrics — and no tool is linked as if it were built.
 */
const AVAILABLE_TOOLS: ReadonlyArray<{
  label: string;
  detail: string;
  href: string;
  permission: AdminPermission;
}> = [
  {
    label: "Listing moderation",
    detail: "Approve, reject, or send listings back to review.",
    href: "/admin/listings",
    permission: "listings.review",
  },
  {
    label: "Reports",
    detail:
      "Review reports filed against listings, accounts, and conversations.",
    href: "/admin/reports",
    permission: "reports.manage",
  },
  {
    label: "Accounts",
    detail:
      "Look up accounts and restrict, suspend, or restore access with an audit trail.",
    href: "/admin/accounts",
    permission: "users.view",
  },
  {
    label: "Categories",
    detail: "Create, edit, reorder, and disable the marketplace category tree.",
    href: "/admin/categories",
    permission: "listings.review",
  },
  {
    label: "Deletion requests",
    detail: "Process accounts that asked to be deleted.",
    href: "/admin/deletion-requests",
    permission: "users.manage",
  },
  {
    label: "Admins",
    detail: "Grant or revoke admin roles. Super admins only.",
    href: "/admin/admins",
    permission: "admins.manage",
  },
];

const PLANNED_TOOLS: ReadonlyArray<{
  label: string;
  detail: string;
  permission: AdminPermission;
}> = [
  {
    label: "Sales oversight",
    detail: "A read-only view of seller-recorded sales.",
    permission: "analytics.view",
  },
];

export default async function AdminPage() {
  const admin = await requireAdmin("/admin");
  const role = getAdminRole(admin);
  const permissions = permissionsForRole(role);
  const availableTools = AVAILABLE_TOOLS.filter((tool) =>
    permissions.includes(tool.permission),
  );
  const plannedTools = PLANNED_TOOLS.filter((tool) =>
    permissions.includes(tool.permission),
  );

  return (
    <div className="flex flex-col gap-6">
      <SellerPageHeader
        title="Admin"
        description="Platform administration for Pantaker. Access is limited to accounts granted an admin role."
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <SettingsCard
          title="Your access"
          description="Your admin session and what this role can do."
        >
          <SettingsRow label="Account" value={admin.email ?? admin.id} />
          <SettingsRow
            label="Role"
            value={role ? ADMIN_ROLE_LABELS[role] : "—"}
            note={role ? ADMIN_ROLE_DESCRIPTIONS[role] : undefined}
          />
          <SettingsRow
            label="Permissions"
            value={
              permissions.length > 0
                ? permissions
                    .map((permission) => ADMIN_PERMISSION_LABELS[permission])
                    .join(", ")
                : "None"
            }
            note="Roles live in the server-owned users table; only admin actions can write them."
          />
        </SettingsCard>

        <SettingsCard
          title="Administration tools"
          description="Each tool is built behind a permission gate. Tools marked available read and write real records."
        >
          <ul className="flex flex-col gap-4">
            {availableTools.map((tool) => (
              <li key={tool.label} className="min-w-0">
                <Link
                  href={tool.href}
                  className="text-[13px] font-semibold text-[var(--color-shop-violet)] underline-offset-4 hover:underline"
                >
                  {tool.label}
                </Link>
                <p className="mt-0.5 text-[12px] leading-relaxed text-[var(--color-muted-gray)]">
                  {tool.detail}
                </p>
                <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-[var(--color-ash-veil)]">
                  Requires {ADMIN_PERMISSION_LABELS[tool.permission]} ·
                  Available
                </p>
              </li>
            ))}
            {plannedTools.map((tool) => (
              <li key={tool.label} className="min-w-0">
                <p className="text-[13px] font-semibold text-[var(--color-ink-black)]">
                  {tool.label}
                </p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-[var(--color-muted-gray)]">
                  {tool.detail}
                </p>
                <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-[var(--color-ash-veil)]">
                  Requires {ADMIN_PERMISSION_LABELS[tool.permission]} · Coming
                  soon
                </p>
              </li>
            ))}
          </ul>
        </SettingsCard>
      </div>
    </div>
  );
}

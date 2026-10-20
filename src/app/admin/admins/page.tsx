import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminPermission } from "@/features/admin/authorization";
import {
  loadAdminRoleRows,
  type AdminRoleRow,
} from "@/features/admin/admin-queries";
import { ADMIN_ROLE_LABELS } from "@/features/admin/roles";
import { SellerPageHeader } from "@/components/seller/SellerPageHeader";
import {
  AdminDataTable,
  type AdminColumn,
} from "@/components/admin/AdminDataTable";
import { AdminRoleActions } from "@/components/admin/AdminRoleActions";
import { StatusPill } from "@/components/ui/status-pill";
import { Timestamp } from "@/components/ui/timestamp";

export const metadata: Metadata = {
  title: "Admins — Pantaker Admin",
  robots: { index: false, follow: false },
};

const columns: Array<AdminColumn<AdminRoleRow>> = [
  {
    key: "account",
    header: "Account",
    render: (row) => (
      <div className="min-w-0">
        <p className="break-words font-semibold text-[var(--color-ink-black)]">
          {row.email ?? "No email on file"}
        </p>
        <p className="mt-0.5 break-all text-[11px] text-[var(--color-muted-gray)]">
          {row.id}
        </p>
      </div>
    ),
  },
  {
    key: "role",
    header: "Role",
    render: (row) => <StatusPill>{ADMIN_ROLE_LABELS[row.role]}</StatusPill>,
  },
  {
    key: "last_sign_in",
    header: "Last sign-in",
    render: (row) => <Timestamp value={row.lastSignInAt} mode="datetime" />,
  },
];

export default async function AdminAdminsPage() {
  await requireAdminPermission("admins.manage", "/admin/admins");
  const result = await loadAdminRoleRows();

  return (
    <div className="flex flex-col gap-6">
      <SellerPageHeader
        title="Admins"
        description="Grant or revoke admin roles. Roles are stored on the server-owned user record and every change is written to the admin audit trail."
      >
        <Link
          href="/admin"
          className="inline-flex h-10 items-center justify-center rounded-full border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] px-4 text-[13px] font-semibold text-[var(--color-ink-black)] transition-colors duration-150 hover:border-[var(--color-ink-30)]"
        >
          Back to admin
        </Link>
      </SellerPageHeader>

      {!result.ok ? (
        <div className="shop-card p-8 text-center">
          <h2 className="font-brand-serif text-lg font-bold tracking-tight text-[var(--color-ink-black)]">
            Admin directory unavailable
          </h2>
          <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-[var(--color-muted-gray)]">
            {result.error}
          </p>
        </div>
      ) : result.rows.length === 0 ? (
        <div className="shop-card p-10 text-center">
          <h2 className="font-brand-serif text-lg font-bold tracking-tight text-[var(--color-ink-black)]">
            No admin roles found
          </h2>
          <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-[var(--color-muted-gray)]">
            Grant the first admin role with a one-off database update (see
            README).
          </p>
        </div>
      ) : (
        <AdminDataTable
          caption="Pantaker administrators"
          columns={columns}
          rows={result.rows}
          getRowKey={(row) => row.id}
          rowActions={(row) => (
            <AdminRoleActions
              userId={row.id}
              email={row.email}
              role={row.role}
            />
          )}
        />
      )}
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminPermission } from "@/features/admin/authorization";
import {
  loadDeletionRequests,
  type AdminDeletionRequestRow,
} from "@/features/admin/deletion-queries";
import { SellerPageHeader } from "@/components/seller/SellerPageHeader";
import { AdminDataTable, type AdminColumn } from "@/components/admin/AdminDataTable";
import { DeletionRequestActions } from "@/components/admin/DeletionRequestActions";
import { Timestamp } from "@/components/ui/timestamp";

export const metadata: Metadata = {
  title: "Deletion requests — Pantaker Admin",
  robots: { index: false, follow: false },
};

const columns: Array<AdminColumn<AdminDeletionRequestRow>> = [
  {
    key: "account",
    header: "Account",
    render: (row) => (
      <div className="min-w-0">
        <p className="break-words font-semibold text-[var(--color-ink-black)]">
          {row.displayName ?? row.username ?? "No profile name"}
        </p>
        <p className="mt-0.5 break-words text-[12px] text-[var(--color-muted-gray)]">
          {row.email ?? "No email on file"}
        </p>
        <p className="mt-0.5 break-all text-[11px] text-[var(--color-ash-veil)]">{row.id}</p>
      </div>
    ),
  },
  {
    key: "requested",
    header: "Requested",
    render: (row) => <Timestamp value={row.requestedAt} mode="datetime" />,
  },
];

export default async function AdminDeletionRequestsPage() {
  await requireAdminPermission("users.manage", "/admin/deletion-requests");
  const result = await loadDeletionRequests();

  return (
    <div className="flex flex-col gap-6">
      <SellerPageHeader
        title="Deletion requests"
        description="Accounts that asked to be deleted. Deleting removes their Auth identity and marketplace data, then cleans up unreferenced images."
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
            Deletion queue unavailable
          </h2>
          <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-[var(--color-muted-gray)]">
            {result.error}
          </p>
        </div>
      ) : (
        <AdminDataTable
          caption="Pending account deletion requests"
          columns={columns}
          rows={result.rows}
          getRowKey={(row) => row.id}
          rowActions={(row) => (
            <DeletionRequestActions
              userId={row.id}
              label={row.displayName ?? row.email ?? row.id}
            />
          )}
          empty={
            <div className="shop-card p-10 text-center">
              <h2 className="font-brand-serif text-lg font-bold tracking-tight text-[var(--color-ink-black)]">
                No pending requests
              </h2>
              <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-[var(--color-muted-gray)]">
                When a seller asks to delete their account without a service-role key configured, it
                appears here.
              </p>
            </div>
          }
        />
      )}
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminPermission } from "@/features/admin/authorization";
import {
  ACCOUNT_DISPLAY_STATUSES,
  ACCOUNT_STATUS_LABELS,
  accountStatusDescription,
  accountStatusTone,
  type AccountDisplayStatus,
} from "@/features/admin/account-rules";
import { loadAdminAccounts } from "@/features/admin/account-queries";
import {
  buildQueryString,
  parseAdminListParams,
  parseEnum,
  withQuery,
} from "@/features/admin/list-params";
import { ADMIN_ROLE_LABELS } from "@/features/admin/roles";
import { SellerPageHeader } from "@/components/seller/SellerPageHeader";
import { AccountRestrictionActions } from "@/components/admin/AccountRestrictionActions";
import { AdminDataTable, type AdminColumn } from "@/components/admin/AdminDataTable";
import { AdminFilterForm } from "@/components/admin/AdminFilterForm";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { StatusPill } from "@/components/ui/status-pill";
import { Timestamp } from "@/components/ui/timestamp";
import type { AdminAccountRow } from "@/features/admin/account-rules";

export const metadata: Metadata = {
  title: "Accounts — Pantaker Admin",
  robots: { index: false, follow: false },
};

type RawSearchParams = Record<string, string | string[] | undefined>;

const STATUS_OPTIONS = [
  { value: "", label: "All accounts" },
  { value: "active", label: "Active" },
  { value: "restricted", label: "Restricted" },
  { value: "suspended", label: "Suspended" },
];

const columns: Array<AdminColumn<AdminAccountRow>> = [
  {
    key: "account",
    header: "Account",
    render: (row) => (
      <div className="min-w-0">
        <p className="break-words font-semibold text-[var(--color-ink-black)]">
          {row.email ?? "No email on file"}
        </p>
        <p className="mt-0.5 break-all text-[11px] text-[var(--color-muted-gray)]">{row.id}</p>
        {row.role && (
          <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-[var(--color-ash-veil)]">
            {ADMIN_ROLE_LABELS[row.role]}
          </p>
        )}
      </div>
    ),
  },
  {
    key: "status",
    header: "Status",
    render: (row) => (
      <div className="flex flex-col items-start gap-1">
        <StatusPill tone={accountStatusTone(row.status)}>
          {ACCOUNT_STATUS_LABELS[row.status]}
        </StatusPill>
        <span className="text-[11px] text-[var(--color-muted-gray)]">
          {accountStatusDescription(row.status)}
        </span>
      </div>
    ),
  },
  {
    key: "restriction",
    header: "Restriction",
    render: (row) => {
      if (!row.restriction) {
        return (
          <p className="max-w-[280px] text-[12px] text-[var(--color-muted-gray)]">
            {row.legacyBannedUntil
              ? "Auth ban recorded before account statuses existed."
              : "No restriction."}
          </p>
        );
      }
      return (
        <div className="max-w-[320px]">
          <p className="text-[12px] leading-relaxed text-[var(--color-ink-black)]">
            {row.restriction.reason}
          </p>
          <p className="mt-1 text-[11px] text-[var(--color-muted-gray)]">
            by {row.responsibleAdmin?.email ?? row.responsibleAdmin?.id ?? "unknown admin"}
          </p>
        </div>
      );
    },
  },
  {
    key: "dates",
    header: "Restriction dates",
    render: (row) => {
      if (!row.restriction && !row.legacyBannedUntil) {
        return <span className="text-[var(--color-muted-gray)]">—</span>;
      }
      const start = row.restriction?.starts_at ?? null;
      const end = row.restriction?.ends_at ?? row.legacyBannedUntil;
      return (
        <div className="flex flex-col gap-0.5 text-[12px]">
          <span>
            Started <Timestamp value={start} />
          </span>
          <span className="text-[var(--color-muted-gray)]">
            {end ? (
              <>
                Ends <Timestamp value={end} mode="datetime" />
              </>
            ) : (
              "No end date"
            )}
          </span>
        </div>
      );
    },
  },
  {
    key: "last_sign_in",
    header: "Last sign-in",
    render: (row) => <Timestamp value={row.lastSignInAt} mode="datetime" />,
  },
];

export default async function AdminAccountsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  await requireAdminPermission("users.view", "/admin/accounts");

  const raw = await searchParams;
  const { q, page } = parseAdminListParams(raw);
  const status = parseEnum<AccountDisplayStatus>(raw.status, ACCOUNT_DISPLAY_STATUSES);
  const result = await loadAdminAccounts({ q, status, page });

  const hrefForPage = (nextPage: number) =>
    withQuery("/admin/accounts", buildQueryString({ q, status, page: nextPage }));

  return (
    <div className="flex flex-col gap-6">
      <SellerPageHeader
        title="Accounts"
        description="Look up accounts and manage restricted or suspended access. Every change records a reason and the responsible administrator."
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
            Account directory unavailable
          </h2>
          <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-[var(--color-muted-gray)]">
            {result.error}
          </p>
        </div>
      ) : (
        <>
          <AdminFilterForm
            action="/admin/accounts"
            q={q}
            searchLabel="Search accounts"
            searchPlaceholder="Email or account id"
            filters={[
              { name: "status", label: "Status", value: status, options: STATUS_OPTIONS },
            ]}
            resetHref="/admin/accounts"
          />

          <div className="flex flex-wrap items-center gap-2 text-[12px] text-[var(--color-muted-gray)]">
            <span className="rounded-full bg-[var(--color-canvas-mist)] px-3 py-1 font-semibold text-[var(--color-ink-black)]">
              {result.counts.all} total
            </span>
            <span className="rounded-full bg-[var(--color-canvas-mist)] px-3 py-1 font-semibold text-[var(--color-ink-black)]">
              {result.counts.suspended} suspended
            </span>
            <span className="rounded-full bg-[var(--color-canvas-mist)] px-3 py-1 font-semibold text-[var(--color-ink-black)]">
              {result.counts.restricted} restricted
            </span>
            <span className="rounded-full bg-[var(--color-canvas-mist)] px-3 py-1 font-semibold text-[var(--color-ink-black)]">
              {result.counts.active} active
            </span>
          </div>

          <AdminDataTable
            caption="Pantaker accounts"
            columns={columns}
            rows={result.rows}
            getRowKey={(row) => row.id}
            rowActions={(row) => (
              <AccountRestrictionActions
                userId={row.id}
                email={row.email}
                status={row.status}
              />
            )}
            empty={
              <div className="shop-card p-10 text-center">
                <h2 className="font-brand-serif text-lg font-bold tracking-tight text-[var(--color-ink-black)]">
                  No accounts match
                </h2>
                <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-[var(--color-muted-gray)]">
                  Try a different search term or clear the status filter.
                </p>
                <Link
                  href="/admin/accounts"
                  className="mt-5 inline-flex h-10 items-center justify-center rounded-full bg-[var(--color-shop-violet)] px-4 text-[13px] font-semibold text-[var(--color-pure-white)] transition-colors duration-150 hover:bg-[var(--color-primary-hover)]"
                >
                  Clear filters
                </Link>
              </div>
            }
          />

          <AdminPagination
            page={result.page}
            pageSize={result.pageSize}
            totalItems={result.total}
            hrefForPage={hrefForPage}
            itemLabel="accounts"
          />
        </>
      )}
    </div>
  );
}

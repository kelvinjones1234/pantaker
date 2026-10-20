import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminPermission } from "@/features/admin/authorization";
import {
  REPORT_STATUSES,
  REPORT_STATUS_LABELS,
  type AdminReportStatus,
} from "@/features/admin/moderation-rules";
import { loadAdminReports, type AdminReportRow } from "@/features/admin/moderation-queries";
import {
  buildQueryString,
  parseAdminListParams,
  parseEnum,
  withQuery,
} from "@/features/admin/list-params";
import { SellerPageHeader } from "@/components/seller/SellerPageHeader";
import { AdminDataTable, type AdminColumn } from "@/components/admin/AdminDataTable";
import { AdminFilterForm } from "@/components/admin/AdminFilterForm";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { ReportModerationActions } from "@/components/admin/ReportModerationActions";
import { StatusPill } from "@/components/ui/status-pill";
import { Timestamp } from "@/components/ui/timestamp";

export const metadata: Metadata = {
  title: "Reports — Pantaker Admin",
  robots: { index: false, follow: false },
};

const STATUS_OPTIONS = [
  { value: "", label: "All reports" },
  ...REPORT_STATUSES.map((status) => ({ value: status, label: REPORT_STATUS_LABELS[status] })),
];

const columns: Array<AdminColumn<AdminReportRow>> = [
  {
    key: "report",
    header: "Report",
    render: (row) => (
      <div className="min-w-0 max-w-[380px]">
        <p className="break-words font-semibold text-[var(--color-ink-black)]">{row.reason}</p>
        {row.details && (
          <p className="mt-1 whitespace-pre-wrap break-words text-[12px] leading-relaxed text-[var(--color-muted-gray)]">
            {row.details}
          </p>
        )}
        <p className="mt-1 text-[11px] text-[var(--color-ash-veil)]">
          Filed <Timestamp value={row.created_at} mode="datetime" />
        </p>
      </div>
    ),
  },
  {
    key: "target",
    header: "Target",
    render: (row) => (
      <div className="flex min-w-0 max-w-[280px] flex-col gap-1 text-[12px]">
        {row.listing_id && (
          <Link
            href={`/marketplace/listing/${row.listing_id}`}
            className="break-words font-semibold text-[var(--color-shop-violet)] underline-offset-4 hover:underline"
          >
            {row.listing_title ?? "View listing"}
          </Link>
        )}
        {row.reported_user_id && (
          <span className="text-[var(--color-muted-gray)]">
            User: {row.reported_name ?? row.reported_user_id}
          </span>
        )}
        {row.conversation_id && (
          <span className="break-all text-[11px] text-[var(--color-muted-gray)]">
            Conversation {row.conversation_id}
          </span>
        )}
      </div>
    ),
  },
  {
    key: "reporter",
    header: "Reporter",
    render: (row) => (
      <div className="max-w-[220px] text-[12px]">
        <p className="break-words text-[var(--color-ink-black)]">
          {row.reporter_name ?? "No profile name"}
        </p>
        <p className="mt-0.5 break-all text-[11px] text-[var(--color-muted-gray)]">
          {row.reporter_id}
        </p>
      </div>
    ),
  },
  {
    key: "status",
    header: "Status",
    render: (row) => (
      <div className="flex flex-col items-start gap-1">
        <StatusPill tone={row.status === "open" ? "warning" : "neutral"}>
          {REPORT_STATUS_LABELS[row.status]}
        </StatusPill>
        {row.resolution_note && (
          <span className="max-w-[220px] text-[11px] leading-relaxed text-[var(--color-muted-gray)]">
            {row.resolution_note}
          </span>
        )}
        {row.resolved_at && (
          <span className="text-[11px] text-[var(--color-ash-veil)]">
            Closed <Timestamp value={row.resolved_at} mode="datetime" />
          </span>
        )}
      </div>
    ),
  },
];

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPermission("reports.manage", "/admin/reports");

  const raw = await searchParams;
  const { q, page } = parseAdminListParams(raw);
  const status = parseEnum<AdminReportStatus>(raw.status, REPORT_STATUSES);
  const result = await loadAdminReports({ q, status, page });

  const hrefForPage = (nextPage: number) =>
    withQuery("/admin/reports", buildQueryString({ q, status, page: nextPage }));

  return (
    <div className="flex flex-col gap-6">
      <SellerPageHeader
        title="Reports"
        description="Review reports against listings, accounts, and conversations. Closing a report records the decision and the responsible administrator."
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
            Reports unavailable
          </h2>
          <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-[var(--color-muted-gray)]">
            {result.error}
          </p>
        </div>
      ) : (
        <>
          <AdminFilterForm
            action="/admin/reports"
            q={q}
            searchLabel="Search reports"
            searchPlaceholder="Reason or details"
            filters={[{ name: "status", label: "Status", value: status, options: STATUS_OPTIONS }]}
            resetHref="/admin/reports"
          />

          <div className="flex flex-wrap items-center gap-2 text-[12px] text-[var(--color-muted-gray)]">
            <span className="rounded-full bg-[var(--color-canvas-mist)] px-3 py-1 font-semibold text-[var(--color-ink-black)]">
              {result.counts.open} open
            </span>
            <span className="rounded-full bg-[var(--color-canvas-mist)] px-3 py-1 font-semibold text-[var(--color-ink-black)]">
              {result.counts.reviewing} reviewing
            </span>
            <span className="rounded-full bg-[var(--color-canvas-mist)] px-3 py-1 font-semibold text-[var(--color-ink-black)]">
              {result.counts.resolved} resolved
            </span>
            <span className="rounded-full bg-[var(--color-canvas-mist)] px-3 py-1 font-semibold text-[var(--color-ink-black)]">
              {result.counts.all} total
            </span>
          </div>

          <AdminDataTable
            caption="Reports filed by Pantaker users"
            columns={columns}
            rows={result.rows}
            getRowKey={(row) => row.id}
            rowActions={(row) => (
              <ReportModerationActions
                reportId={row.id}
                reason={row.reason}
                status={row.status}
              />
            )}
            empty={
              <div className="shop-card p-10 text-center">
                <h2 className="font-brand-serif text-lg font-bold tracking-tight text-[var(--color-ink-black)]">
                  No reports match
                </h2>
                <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-[var(--color-muted-gray)]">
                  Try a different search term or clear the status filter.
                </p>
                <Link
                  href="/admin/reports"
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
            itemLabel="reports"
          />
        </>
      )}
    </div>
  );
}

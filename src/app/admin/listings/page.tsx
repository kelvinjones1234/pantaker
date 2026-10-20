import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminPermission } from "@/features/admin/authorization";
import { LISTING_STATUS_LABELS } from "@/features/admin/moderation-rules";
import {
  loadAdminListings,
  MODERATION_LISTING_STATUS_OPTIONS,
  type AdminListingRow,
} from "@/features/admin/moderation-queries";
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
import { ListingModerationActions } from "@/components/admin/ListingModerationActions";
import { StatusPill } from "@/components/ui/status-pill";
import { Timestamp } from "@/components/ui/timestamp";
import type { ItemStatus } from "@/types/marketplace";

export const metadata: Metadata = {
  title: "Listing moderation — Pantaker Admin",
  robots: { index: false, follow: false },
};

const STATUS_VALUES: readonly ItemStatus[] = [
  "draft",
  "pending_review",
  "published",
  "rejected",
  "sold",
  "archived",
];

const columns: Array<AdminColumn<AdminListingRow>> = [
  {
    key: "listing",
    header: "Listing",
    render: (row) => (
      <div className="min-w-0">
        <p className="max-w-[360px] break-words font-semibold text-[var(--color-ink-black)]">
          {row.title}
        </p>
        <p className="mt-0.5 text-[12px] text-[var(--color-muted-gray)]">
          {row.category ?? "No category"} · {row.city}
          {row.area ? `, ${row.area}` : ""}
        </p>
        {row.item_status === "published" && (
          <Link
            href={`/marketplace/listing/${row.id}`}
            className="mt-1 inline-block text-[11px] font-semibold text-[var(--color-shop-violet)] underline-offset-4 hover:underline"
          >
            View public listing
          </Link>
        )}
      </div>
    ),
  },
  {
    key: "status",
    header: "Status",
    render: (row) => (
      <StatusPill tone={row.item_status === "rejected" ? "danger" : "neutral"}>
        {LISTING_STATUS_LABELS[row.item_status]}
      </StatusPill>
    ),
  },
  {
    key: "price",
    header: "Price",
    render: (row) =>
      row.price == null ? (
        <span className="text-[var(--color-muted-gray)]">Contact</span>
      ) : (
        <span className="tabular">
          ₦{row.price.toLocaleString("en-NG")}
          {row.pricing_type === "negotiable" && (
            <span className="ml-1 text-[11px] text-[var(--color-muted-gray)]">neg.</span>
          )}
        </span>
      ),
  },
  {
    key: "dates",
    header: "Submitted",
    render: (row) => (
      <div className="flex flex-col gap-0.5 text-[12px]">
        <Timestamp value={row.created_at} mode="datetime" />
        <span className="text-[11px] text-[var(--color-muted-gray)]">
          Updated <Timestamp value={row.updated_at} mode="datetime" />
        </span>
      </div>
    ),
  },
];

export default async function AdminListingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPermission("listings.review", "/admin/listings");

  const raw = await searchParams;
  const { q, page } = parseAdminListParams(raw);
  const status = parseEnum<ItemStatus>(raw.status, STATUS_VALUES);
  const result = await loadAdminListings({ q, status, page });

  const hrefForPage = (nextPage: number) =>
    withQuery("/admin/listings", buildQueryString({ q, status, page: nextPage }));

  return (
    <div className="flex flex-col gap-6">
      <SellerPageHeader
        title="Listing moderation"
        description="Approve listings into the marketplace, reject them with a reason, or send an edited live listing back to review."
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
            Moderation queue unavailable
          </h2>
          <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-[var(--color-muted-gray)]">
            {result.error}
          </p>
        </div>
      ) : (
        <>
          <AdminFilterForm
            action="/admin/listings"
            q={q}
            searchLabel="Search listings"
            searchPlaceholder="Title"
            filters={[
              {
                name: "status",
                label: "Status",
                value: status,
                options: MODERATION_LISTING_STATUS_OPTIONS.map((option) => ({
                  value: option.value,
                  label: option.label,
                })),
              },
            ]}
            resetHref="/admin/listings"
          />

          <div className="flex flex-wrap items-center gap-2 text-[12px] text-[var(--color-muted-gray)]">
            <span className="rounded-full bg-[var(--color-canvas-mist)] px-3 py-1 font-semibold text-[var(--color-ink-black)]">
              {result.counts.pending_review} pending review
            </span>
            <span className="rounded-full bg-[var(--color-canvas-mist)] px-3 py-1 font-semibold text-[var(--color-ink-black)]">
              {result.counts.published} published
            </span>
            <span className="rounded-full bg-[var(--color-canvas-mist)] px-3 py-1 font-semibold text-[var(--color-ink-black)]">
              {result.counts.rejected} rejected
            </span>
            <span className="rounded-full bg-[var(--color-canvas-mist)] px-3 py-1 font-semibold text-[var(--color-ink-black)]">
              {result.counts.all} total
            </span>
          </div>

          <AdminDataTable
            caption="Listings awaiting or undergoing moderation"
            columns={columns}
            rows={result.rows}
            getRowKey={(row) => row.id}
            rowActions={(row) => (
              <ListingModerationActions
                listingId={row.id}
                title={row.title}
                status={row.item_status}
              />
            )}
            empty={
              <div className="shop-card p-10 text-center">
                <h2 className="font-brand-serif text-lg font-bold tracking-tight text-[var(--color-ink-black)]">
                  No listings match
                </h2>
                <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-[var(--color-muted-gray)]">
                  Try a different search term or clear the status filter.
                </p>
                <Link
                  href="/admin/listings"
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
            itemLabel="listings"
          />
        </>
      )}
    </div>
  );
}

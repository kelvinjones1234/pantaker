import type { Metadata } from "next";
import Link from "next/link";
import { requireSeller } from "@/features/auth/authorization";
import {
  getSellerEnquiryOptions,
  getSellerSales,
  getSellerSaleOptions,
  type SaleView,
} from "@/features/sales/queries";
import { salesFilterSchema } from "@/lib/validation/sales";
import { formatNGN, timeAgo } from "@/lib/utils";
import { SALE_STATUS_FILTERS } from "@/lib/sale-status";
import { PlusIcon, ReceiptIcon } from "@/components/brand/icons";
import { SellerPageHeader } from "@/components/seller/SellerPageHeader";
import { SellerEmptyState } from "@/components/seller/SellerEmptyState";
import { SaleStatusPill } from "@/components/seller/SaleStatusPill";
import { RecordSaleForm } from "@/components/seller/RecordSaleForm";
import type { SaleStatus } from "@/types/marketplace";
import { isPrismaConfigured } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Sales — Pantaker",
  description:
    "Record and track the sales you make from your Pantaker listings.",
};

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function buyerName(sale: SaleView): string {
  if (sale.buyer_label) return sale.buyer_label;
  if (sale.buyer)
    return (
      sale.buyer.display_name ??
      (sale.buyer.username ? `@${sale.buyer.username}` : "Signed-in buyer")
    );
  return "Not recorded";
}

export default async function SellerSalesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireSeller("/seller/sales");

  const raw = await searchParams;
  const { status } = salesFilterSchema.parse({ status: one(raw.status) });

  const [summary, listingOptions, enquiryOptions] = await Promise.all([
    getSellerSales(),
    getSellerSaleOptions(),
    getSellerEnquiryOptions(),
  ]);

  const visible = status
    ? summary.items.filter((sale) => sale.status === status)
    : summary.items;

  return (
    <div className="flex flex-col gap-6">
      <SellerPageHeader
        title="Sales"
        description="Record who bought what, agree a price, and track each sale through to collection. Pantaker doesn't process payments — this is your own record."
      />

      <details className="shop-card group p-5 sm:p-7">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-primary-tint)]">
              <PlusIcon className="h-4 w-4 text-[var(--color-shop-violet)]" />
            </span>
            <span>
              <span className="block font-brand-serif text-lg font-bold tracking-tight text-[var(--color-ink-black)]">
                Record a sale
              </span>
              <span className="block text-[12px] text-[var(--color-muted-gray)]">
                Start tracking a sale against one of your listings.
              </span>
            </span>
          </span>
          <span className="text-[12px] font-semibold text-[var(--color-shop-violet)] group-open:hidden">
            Open
          </span>
        </summary>
        <div className="mt-5">
          <RecordSaleForm
            listings={listingOptions}
            enquiries={enquiryOptions}
            isLive={isPrismaConfigured()}
          />
        </div>
      </details>

      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="Filter sales"
      >
        {SALE_STATUS_FILTERS.map((filter) => {
          const active = filter.value === status;
          const count = filter.value
            ? summary.counts[filter.value]
            : summary.counts.all;
          const href = filter.value
            ? `/seller/sales?status=${filter.value}`
            : "/seller/sales";
          return (
            <Link
              key={filter.value || "all"}
              href={href}
              aria-current={active ? "page" : undefined}
              className={
                active
                  ? "inline-flex items-center gap-2 rounded-full bg-[var(--color-shop-violet)] px-4 py-2 text-[12px] font-semibold text-[var(--color-pure-white)] transition-colors duration-150"
                  : "inline-flex items-center gap-2 rounded-full border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] px-4 py-2 text-[12px] font-medium text-[var(--color-ink-black)] transition-colors duration-150 hover:border-[var(--color-ink-30)]"
              }
            >
              {filter.label}
              <span
                className={
                  active
                    ? "text-[var(--color-pure-white)]/80"
                    : "text-[var(--color-muted-gray)]"
                }
              >
                {count}
              </span>
            </Link>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <SellerEmptyState
          icon={
            <ReceiptIcon className="h-6 w-6 text-[var(--color-shop-violet)]" />
          }
          heading={status ? "No sales with this status" : "No sales yet"}
          copy={
            status
              ? "Nothing here right now. Try another status, or view all sales."
              : "When something sells, record it here to track the buyer, the agreed price, and collection."
          }
        >
          {status ? (
            <Link
              href="/seller/sales"
              className="inline-flex h-11 items-center rounded-full border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] px-5 text-sm font-semibold text-[var(--color-ink-black)] transition-colors duration-150 hover:border-[var(--color-ink-30)]"
            >
              View all sales
            </Link>
          ) : null}
        </SellerEmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {visible.map((sale) => (
            <li key={sale.id}>
              <Link
                href={`/seller/sales/${sale.id}`}
                className="shop-card flex flex-col gap-3 p-5 transition-colors duration-150 hover:border-[var(--color-ink-30)] sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-semibold text-[var(--color-ink-black)]">
                    {sale.listing?.title ?? "Listing no longer available"}
                  </p>
                  <p className="mt-1 text-[12px] text-[var(--color-muted-gray)]">
                    {buyerName(sale)} · recorded {timeAgo(sale.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[13px] font-semibold text-[var(--color-ink-black)]">
                    {sale.agreed_price != null
                      ? formatNGN(sale.agreed_price)
                      : "Price not recorded"}
                  </span>
                  <SaleStatusPill status={sale.status as SaleStatus} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

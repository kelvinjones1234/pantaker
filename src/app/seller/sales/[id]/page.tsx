import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSeller } from "@/features/auth/authorization";
import { getSellerSale } from "@/features/sales/queries";
import { isActiveSaleStatus } from "@/features/sales/lifecycle";
import { saleStatusMeta } from "@/lib/sale-status";
import { formatNGN, timeAgo } from "@/lib/utils";
import { SellerPageHeader } from "@/components/seller/SellerPageHeader";
import { SettingsCard, SettingsRow } from "@/components/seller/SettingsCard";
import { SaleStatusPill } from "@/components/seller/SaleStatusPill";
import { SaleControls } from "@/components/seller/SaleControls";
import { isPrismaConfigured } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Sale — Pantaker",
};

function buyerSummary(
  sale: NonNullable<Awaited<ReturnType<typeof getSellerSale>>>,
): string | undefined {
  if (sale.buyer_label) return sale.buyer_label;
  if (sale.buyer) {
    return (
      sale.buyer.display_name ??
      (sale.buyer.username ? `@${sale.buyer.username}` : "Signed-in buyer")
    );
  }
  return undefined;
}

export default async function SaleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireSeller(`/seller/sales/${id}`);

  // getSellerSale is scoped to the session, so another seller's id resolves to
  // null and 404s — the id in the URL is never trusted.
  const sale = await getSellerSale(id);
  if (!sale) notFound();

  const meta = saleStatusMeta(sale.status);
  const listing = sale.listing;
  const listingHref = listing
    ? `/seller/listings/${listing.id}/edit`
    : "/seller/listings";

  // Consistency with the listing's public availability. The two are kept
  // separate — a sale never silently flips the listing — so we show the seller
  // what the buyer currently sees and how to fix it.
  let callout: { title: string; body: string; cta: string } | null = null;
  if (listing) {
    if (
      isActiveSaleStatus(sale.status) &&
      listing.item_status === "published"
    ) {
      callout = {
        title: "This listing is still live",
        body: "The buyer can still find it on the marketplace. Mark it sold or archive it to take it down.",
        cta: "Manage listing",
      };
    } else if (sale.status === "completed" && listing.item_status !== "sold") {
      callout = {
        title: "Mark this listing as sold",
        body: "You completed the sale, but the listing isn't marked sold yet, so buyers may still see it as available.",
        cta: "Mark sold",
      };
    } else if (sale.status === "cancelled" && listing.item_status === "sold") {
      callout = {
        title: "This listing is marked sold",
        body: "The sale was cancelled but the listing still shows as sold. Relist it if it's available again.",
        cta: "Manage listing",
      };
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/seller/sales"
          className="text-[12px] font-semibold text-[var(--color-shop-violet)] transition-colors duration-150 hover:text-[var(--color-primary-hover)]"
        >
          ← All sales
        </Link>
      </div>

      <SellerPageHeader
        title={listing?.title ?? "Sale"}
        description={meta?.description ?? "Everything recorded for this sale."}
      >
        <SaleStatusPill status={sale.status} />
      </SellerPageHeader>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="flex flex-col gap-5">
          <SettingsCard
            title="Sale details"
            description="These are your own records — they are not verified by Pantaker."
          >
            <SettingsRow
              label="Buyer"
              value={buyerSummary(sale) ?? "Not recorded"}
            />
            <SettingsRow
              label="Agreed price"
              value={
                sale.agreed_price != null
                  ? formatNGN(sale.agreed_price)
                  : "Not recorded"
              }
              note="Recorded by you. Pantaker doesn't process or verify payments."
            />
            <SettingsRow label="Recorded" value={timeAgo(sale.created_at)} />
            {sale.completed_at && (
              <SettingsRow
                label="Completed"
                value={timeAgo(sale.completed_at)}
              />
            )}
            {sale.cancelled_at && (
              <SettingsRow
                label="Cancelled"
                value={timeAgo(sale.cancelled_at)}
              />
            )}
            {sale.collection_notes && (
              <SettingsRow
                label="Collection notes"
                value={sale.collection_notes}
              />
            )}
          </SettingsCard>

          {sale.enquiry && (
            <SettingsCard
              title="Linked enquiry"
              description="The message this sale came from."
            >
              <p className="text-[13px] leading-relaxed text-[var(--color-ink-black)]">
                “{sale.enquiry.message}”
              </p>
              <p className="mt-2 text-[12px] text-[var(--color-muted-gray)]">
                {timeAgo(sale.enquiry.created_at)}
              </p>
            </SettingsCard>
          )}

          {callout && (
            <SettingsCard title={callout.title}>
              <p className="text-[13px] leading-relaxed text-[var(--color-ink-black)]">
                {callout.body}
              </p>
              <div className="mt-4">
                <Link
                  href={listingHref}
                  className="inline-flex h-11 items-center rounded-full bg-[var(--color-shop-violet)] px-5 text-sm font-semibold text-[var(--color-pure-white)] transition-colors duration-200 hover:bg-[var(--color-primary-hover)]"
                >
                  {callout.cta}
                </Link>
              </div>
            </SettingsCard>
          )}
        </div>

        <div className="flex flex-col gap-5">
          <SettingsCard title="Manage this sale">
            <SaleControls
              saleId={sale.id}
              status={sale.status}
              buyerLabel={sale.buyer_label}
              agreedPrice={sale.agreed_price}
              collectionNotes={sale.collection_notes}
              isLive={isPrismaConfigured()}
            />
          </SettingsCard>

          <div className="shop-card p-5">
            <p className="text-[13px] font-semibold text-[var(--color-ink-black)]">
              The listing
            </p>
            {listing ? (
              <>
                <p className="mt-1 text-[12px] text-[var(--color-muted-gray)]">
                  Currently shown as{" "}
                  <span className="font-semibold text-[var(--color-ink-black)]">
                    {listing.item_status.replace(/_/g, " ")}
                  </span>
                  . Recording a sale never changes this on its own.
                </p>
                <Link
                  href={listingHref}
                  className="mt-4 inline-flex text-[12px] font-semibold text-[var(--color-shop-violet)] transition-colors duration-150 hover:text-[var(--color-primary-hover)]"
                >
                  Open listing →
                </Link>
              </>
            ) : (
              <p className="mt-1 text-[12px] text-[var(--color-muted-gray)]">
                This listing is no longer available, so its status can&apos;t be
                shown.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

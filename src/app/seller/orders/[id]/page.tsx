import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderProgress } from "@/components/orders/OrderProgress";
import { OrderStatusPill } from "@/components/orders/OrderStatusPill";
import { SellerOrderActions } from "@/components/orders/SellerOrderActions";
import { SettingsCard, SettingsRow } from "@/components/seller/SettingsCard";
import { SellerPageHeader } from "@/components/seller/SellerPageHeader";
import { getSellerOrder } from "@/features/orders/queries";
import { orderStatusMeta } from "@/features/orders/lifecycle";
import { formatKobo } from "@/lib/bachs/money";
import { formatAdminDateTime } from "@/lib/datetime";

export const metadata: Metadata = { title: "Online order — Pantaker" };

export default async function SellerOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getSellerOrder(id);
  if (!order) notFound();

  const meta = orderStatusMeta(order.status);
  const canReady = order.status === "held";
  const canHandover = order.status === "ready_for_handover";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/seller/orders"
          className="text-[12px] font-semibold text-[var(--color-shop-violet)] transition-colors duration-150 hover:text-[var(--color-primary-hover)]"
        >
          ← All online orders
        </Link>
      </div>

      <SellerPageHeader
        title={order.item_title}
        description={meta.description}
      >
        <OrderStatusPill status={order.status} />
      </SellerPageHeader>

      <SettingsCard
        title="Order progress"
        description="Where this buyer-protected order is right now."
      >
        <OrderProgress status={order.status} />
      </SettingsCard>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="flex flex-col gap-5">
          {(canReady || canHandover) && (
            <SettingsCard
              title={canReady ? "Get the item ready" : "Confirm handover"}
              description={
                canReady
                  ? "Arrange collection with the buyer. Mark it ready when you have the item in hand."
                  : "Only enter the buyer's code after you have handed over the item."
              }
            >
              <SellerOrderActions
                orderId={order.id}
                canReady={canReady}
                canHandover={canHandover}
              />
            </SettingsCard>
          )}

          {order.status === "handed_over" && (
            <SettingsCard
              title="Handover confirmed"
              description="The buyer can now confirm receipt. Otherwise your payout is released 72 hours after handover, unless a problem is raised."
            >
              <p className="text-[13px] leading-relaxed text-[var(--color-ink-black)]">
                {order.release_due_at
                  ? `Payout due ${formatAdminDateTime(order.release_due_at)}.`
                  : "Payout is being scheduled."}
              </p>
            </SettingsCard>
          )}

          {order.status === "release_blocked" && (
            <SettingsCard
              title="Payout paused"
              description="The buyer raised a problem. Pantaker is reviewing it before your share is released."
            />
          )}

          {order.status === "disputed" && (
            <SettingsCard
              title="Payment disputed"
              description="The buyer's bank raised a dispute. Pantaker is responding and your payout is on hold."
            />
          )}

          {order.status === "released" && (
            <SettingsCard
              title="Paid out"
              description="Your share was sent to your Bachs balance."
            >
              <p className="text-[13px] leading-relaxed text-[var(--color-ink-black)]">
                {order.released_at
                  ? `Released ${formatAdminDateTime(order.released_at)}.`
                  : "Payment completed."}
              </p>
            </SettingsCard>
          )}

          <SettingsCard
            title="Order activity"
            description="Everything that happened on this order."
          >
            <ol className="flex flex-col gap-4">
              {order.events.map((event) => (
                <li key={event.id} className="flex gap-3">
                  <span
                    aria-hidden="true"
                    className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--color-shop-violet)]"
                  />
                  <div>
                    <p className="text-[13px] leading-snug text-[var(--color-ink-black)]">
                      {event.message ?? event.type.replaceAll("_", " ")}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[var(--color-muted-gray)]">
                      {formatAdminDateTime(event.created_at)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </SettingsCard>
        </div>

        <div className="flex flex-col gap-5">
          {order.collection && (
            <SettingsCard title="Collection">
              <SettingsRow
                label="Area"
                value={
                  order.collection.area
                    ? `${order.collection.area}, Abuja`
                    : order.collection.city ?? "Abuja"
                }
              />
              {order.collection.pickup_notes && (
                <p className="mt-3 whitespace-pre-line text-[12px] leading-relaxed text-[var(--color-ash-veil)]">
                  {order.collection.pickup_notes}
                </p>
              )}
            </SettingsCard>
          )}

          <SettingsCard title="Payout">
            <SettingsRow
              label="Item price"
              value={formatKobo(order.item_amount_kobo)}
            />
            <SettingsRow
              label="Pantaker commission (5%)"
              value={`− ${formatKobo(order.commission_kobo)}`}
            />
            <SettingsRow
              label="Your share"
              value={formatKobo(order.seller_share_kobo)}
            />
            <SettingsRow
              label="Buyer"
              value={order.buyer_name ?? order.buyer_email ?? "Pantaker buyer"}
            />
            <SettingsRow
              label="Paid"
              value={
                order.paid_at ? formatAdminDateTime(order.paid_at) : "Not paid yet"
              }
            />
          </SettingsCard>

          <div className="rounded-[20px] bg-[var(--color-canvas-mist)] p-5 text-[12px] leading-relaxed text-[var(--color-ash-veil)]">
            Bachs fees are covered by Pantaker&apos;s commission. Make sure your
            Bachs payouts are enabled in{" "}
            <Link
              href="/seller/settings/payments"
              className="font-semibold text-[var(--color-shop-violet)]"
            >
              payment settings
            </Link>{" "}
            so your share can be paid.
          </div>
        </div>
      </div>
    </div>
  );
}

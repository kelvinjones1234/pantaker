import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPermission } from "@/features/admin/authorization";
import { getAdminOrder } from "@/features/orders/queries";
import { AdminOrderActions } from "@/components/admin/AdminOrderActions";
import { OrderProgress } from "@/components/orders/OrderProgress";
import { OrderStatusPill } from "@/components/orders/OrderStatusPill";
import { SellerPageHeader } from "@/components/seller/SellerPageHeader";
import { formatKobo } from "@/lib/bachs/money";
import { formatAdminDateTime } from "@/lib/datetime";

export const metadata: Metadata = {
  title: "Order — Pantaker Admin",
  robots: { index: false, follow: false },
};

export default async function AdminOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPermission("payments.manage", "/admin/orders");
  const { id } = await params;
  const order = await getAdminOrder(id);
  if (!order) notFound();

  const canRefund =
    order.paid_at != null &&
    !["refund_pending", "refunded"].includes(order.status);
  const canResolve = ["release_blocked", "disputed"].includes(order.status);
  const canForceRelease =
    order.handover_at != null &&
    !["released", "refunded", "refund_pending"].includes(order.status);

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/orders"
        className="text-[12px] font-semibold text-[var(--color-shop-violet)]"
      >
        ← All orders
      </Link>

      <SellerPageHeader
        title={`${order.order_number} · ${order.item_title}`}
        description={`Buyer ${order.buyer_name ?? order.buyer_email ?? "—"} · Seller ${order.seller_name ?? "—"}`}
      >
        <OrderStatusPill status={order.status} />
      </SellerPageHeader>

      <section className="rounded-[20px] bg-[var(--color-pure-white)] p-5">
        <h2 className="text-[12px] font-semibold tracking-[0.12em] text-[var(--color-ash-veil)] uppercase">
          Progress
        </h2>
        <div className="mt-4">
          <OrderProgress status={order.status} />
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="flex flex-col gap-5">
          <section className="rounded-[20px] bg-[var(--color-pure-white)] p-5">
            <h2 className="text-[12px] font-semibold tracking-[0.12em] text-[var(--color-ash-veil)] uppercase">
              Money
            </h2>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-[13px]">
              <div>
                <dt className="text-[11px] text-[var(--color-ash-veil)]">Buyer paid</dt>
                <dd className="font-semibold">{formatKobo(order.item_amount_kobo)}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-[var(--color-ash-veil)]">Commission</dt>
                <dd>{formatKobo(order.commission_kobo)}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-[var(--color-ash-veil)]">Seller share</dt>
                <dd>{formatKobo(order.seller_share_kobo)}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-[var(--color-ash-veil)]">Provider fee</dt>
                <dd>
                  {order.payment?.provider_fee_kobo == null
                    ? "—"
                    : formatKobo(order.payment.provider_fee_kobo)}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-[var(--color-ash-veil)]">Payment</dt>
                <dd>{order.payment?.status ?? "none"}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-[var(--color-ash-veil)]">Charge</dt>
                <dd className="break-all">{order.payment?.charge_id ?? "—"}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-[20px] bg-[var(--color-pure-white)] p-5">
            <h2 className="text-[12px] font-semibold tracking-[0.12em] text-[var(--color-ash-veil)] uppercase">
              Admin actions
            </h2>
            <div className="mt-3">
              <AdminOrderActions
                orderId={order.id}
                canRefund={canRefund}
                canResolve={canResolve}
                canForceRelease={canForceRelease}
              />
            </div>
          </section>

          <section className="rounded-[20px] bg-[var(--color-pure-white)] p-5">
            <h2 className="text-[12px] font-semibold tracking-[0.12em] text-[var(--color-ash-veil)] uppercase">
              Timeline
            </h2>
            <ol className="mt-4 flex flex-col gap-3">
              {order.events.map((event) => (
                <li key={event.id} className="text-[12px] leading-relaxed">
                  <span className="font-semibold text-[var(--color-ink-black)]">
                    {event.message ?? event.type}
                  </span>
                  <span className="block text-[11px] text-[var(--color-ash-veil)]">
                    {formatAdminDateTime(event.created_at)}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <div className="flex flex-col gap-5">
          {order.collection && (
            <section className="rounded-[20px] bg-[var(--color-pure-white)] p-5">
              <h2 className="text-[12px] font-semibold tracking-[0.12em] text-[var(--color-ash-veil)] uppercase">
                Collection
              </h2>
              <p className="mt-2 text-[13px] font-semibold text-[var(--color-ink-black)]">
                {order.collection.area
                  ? `${order.collection.area}, Abuja`
                  : order.collection.city ?? "Abuja"}
              </p>
              {order.collection.pickup_notes && (
                <p className="mt-1 whitespace-pre-line text-[12px] leading-relaxed text-[var(--color-ash-veil)]">
                  {order.collection.pickup_notes}
                </p>
              )}
            </section>
          )}

          <section className="rounded-[20px] bg-[var(--color-pure-white)] p-5">
            <h2 className="text-[12px] font-semibold tracking-[0.12em] text-[var(--color-ash-veil)] uppercase">
              Dates
            </h2>
            <dl className="mt-3 flex flex-col gap-2 text-[12px]">
              <div><dt className="inline text-[var(--color-ash-veil)]">Created: </dt><dd className="inline">{formatAdminDateTime(order.created_at)}</dd></div>
              <div><dt className="inline text-[var(--color-ash-veil)]">Paid: </dt><dd className="inline">{formatAdminDateTime(order.paid_at)}</dd></div>
              <div><dt className="inline text-[var(--color-ash-veil)]">Handover: </dt><dd className="inline">{formatAdminDateTime(order.handover_at)}</dd></div>
              <div><dt className="inline text-[var(--color-ash-veil)]">Release due: </dt><dd className="inline">{formatAdminDateTime(order.release_due_at)}</dd></div>
              <div><dt className="inline text-[var(--color-ash-veil)]">Released: </dt><dd className="inline">{formatAdminDateTime(order.released_at)}</dd></div>
              <div><dt className="inline text-[var(--color-ash-veil)]">Refunded: </dt><dd className="inline">{formatAdminDateTime(order.refunded_at)}</dd></div>
            </dl>
          </section>

          {order.last_release_error && (
            <section className="rounded-[20px] bg-[var(--color-error-bg)] p-5 text-[12px] text-[var(--color-error)]">
              Release error: {order.last_release_error}
            </section>
          )}

          {order.refunds.length > 0 && (
            <section className="rounded-[20px] bg-[var(--color-pure-white)] p-5">
              <h2 className="text-[12px] font-semibold tracking-[0.12em] text-[var(--color-ash-veil)] uppercase">
                Refunds
              </h2>
              <ul className="mt-3 flex flex-col gap-2 text-[12px]">
                {order.refunds.map((refund) => (
                  <li key={refund.id}>
                    {formatKobo(refund.amount_kobo)} · {refund.status}
                    {refund.reason ? ` · ${refund.reason}` : ""}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {order.transfers.length > 0 && (
            <section className="rounded-[20px] bg-[var(--color-pure-white)] p-5">
              <h2 className="text-[12px] font-semibold tracking-[0.12em] text-[var(--color-ash-veil)] uppercase">
                Transfers
              </h2>
              <ul className="mt-3 flex flex-col gap-2 text-[12px]">
                {order.transfers.map((transfer) => (
                  <li key={transfer.id} className="break-words">
                    <span className="capitalize">{transfer.type}</span> ·{" "}
                    {formatKobo(transfer.amount_kobo)} · {transfer.status}
                    {transfer.error ? ` · ${transfer.error}` : ""}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {order.disputes.length > 0 && (
            <section className="rounded-[20px] bg-[var(--color-pure-white)] p-5">
              <h2 className="text-[12px] font-semibold tracking-[0.12em] text-[var(--color-ash-veil)] uppercase">
                Disputes
              </h2>
              <ul className="mt-3 flex flex-col gap-2 text-[12px]">
                {order.disputes.map((dispute) => (
                  <li key={dispute.id}>
                    {dispute.status} · evidence due{" "}
                    {formatAdminDateTime(dispute.evidence_due_at)}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

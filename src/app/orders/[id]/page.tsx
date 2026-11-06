import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BuyerOrderActions } from "@/components/orders/BuyerOrderActions";
import { OrderProgress } from "@/components/orders/OrderProgress";
import { OrderStatusPill } from "@/components/orders/OrderStatusPill";
import { PaymentReturnNotice } from "@/components/orders/PaymentReturnNotice";
import { getBuyerOrder } from "@/features/orders/queries";
import { orderStatusMeta } from "@/features/orders/lifecycle";
import { formatKobo, pickupCodeFor } from "@/lib/bachs/money";
import { formatAdminDateTime } from "@/lib/datetime";

export const metadata: Metadata = { title: "Order — Pantaker" };

export default async function BuyerOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ paid?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const order = await getBuyerOrder(id);
  if (!order) notFound();

  const meta = orderStatusMeta(order.status);
  const paid = order.paid_at != null;
  const pickupCode =
    paid && order.buyer_id ? pickupCodeFor(order.id, order.buyer_id) : null;
  const canConfirm = order.status === "handed_over";
  const canReport = ["held", "ready_for_handover", "handed_over"].includes(
    order.status,
  );

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <Link
        href="/orders"
        className="inline-flex min-h-11 items-center text-[12px] font-semibold text-[var(--color-shop-violet)] transition-colors duration-150 hover:text-[var(--color-primary-hover)]"
      >
        ← All orders
      </Link>

      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.14em] text-[var(--color-ash-veil)] uppercase">
              {order.order_number}
            </p>
            <h1 className="mt-1 text-2xl leading-tight font-semibold text-[var(--color-ink-black)]">
              {order.item_title}
            </h1>
          </div>
          <OrderStatusPill status={order.status} />
        </div>
        <p className="text-[13px] leading-relaxed text-[var(--color-ash-veil)]">
          {meta.description}
        </p>
      </header>

      <PaymentReturnNotice
        requested={query.paid === "1"}
        paid={paid}
        reference={order.payment?.reference ?? null}
      />

      <section className="rounded-[20px] bg-[var(--color-pure-white)] p-5">
        <h2 className="text-[12px] font-semibold tracking-[0.12em] text-[var(--color-ash-veil)] uppercase">
          Order progress
        </h2>
        <div className="mt-4">
          <OrderProgress status={order.status} />
        </div>
      </section>

      <section className="rounded-[20px] bg-[var(--color-pure-white)] p-5">
        <h2 className="text-[12px] font-semibold tracking-[0.12em] text-[var(--color-ash-veil)] uppercase">
          Payment
        </h2>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[11px] text-[var(--color-ash-veil)]">Item price</dt>
            <dd className="font-semibold text-[var(--color-ink-black)]">
              {formatKobo(order.item_amount_kobo)}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] text-[var(--color-ash-veil)]">Held by</dt>
            <dd className="font-semibold text-[var(--color-ink-black)]">
              Pantaker buyer protection
            </dd>
          </div>
          <div>
            <dt className="text-[11px] text-[var(--color-ash-veil)]">Paid</dt>
            <dd className="text-[var(--color-ink-black)]">
              {order.paid_at ? formatAdminDateTime(order.paid_at) : "Not paid yet"}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] text-[var(--color-ash-veil)]">Seller</dt>
            <dd className="text-[var(--color-ink-black)]">
              {order.seller_name ?? "Pantaker seller"}
            </dd>
          </div>
        </dl>
        {!paid && order.payment?.checkout_url && order.status === "pending_payment" && (
          <a
            href={order.payment.checkout_url}
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--color-shop-violet)] px-5 text-sm font-semibold text-[var(--color-pure-white)] transition-colors duration-200 hover:bg-[var(--color-primary-hover)]"
          >
            Complete payment
          </a>
        )}
        {order.status === "payment_failed" && order.payment?.failure_reason && (
          <p className="mt-3 text-[12px] leading-relaxed text-[var(--color-error)]">
            {order.payment.failure_reason}
          </p>
        )}
      </section>

      {pickupCode && canReport && (
        <section className="rounded-[20px] bg-[var(--color-primary-tint)] p-5">
          <h2 className="text-[12px] font-semibold tracking-[0.12em] text-[var(--color-ash-veil)] uppercase">
            Your pickup code
          </h2>
          <p className="mt-2 font-mono text-3xl font-semibold tracking-[0.32em] text-[var(--color-ink-black)]">
            {pickupCode}
          </p>
          <p className="mt-2 text-[12px] leading-relaxed text-[var(--color-ash-veil)]">
            Share this with the seller only when you meet and collect the item. It
            confirms handover so the seller can be paid.
          </p>
        </section>
      )}

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
          <p className="mt-2 text-[12px] leading-relaxed text-[var(--color-ash-veil)]">
            Arrange collection with the seller. Share your pickup code only when
            you meet and collect the item.
          </p>
        </section>
      )}

      {canConfirm && (
        <section className="rounded-[20px] bg-[var(--color-pure-white)] p-5">
          <h2 className="text-[15px] font-semibold text-[var(--color-ink-black)]">
            Got the item?
          </h2>
          <p className="mt-1 mb-4 text-[12px] leading-relaxed text-[var(--color-ash-veil)]">
            Confirming releases the seller&apos;s share now. Otherwise it is released
            72 hours after handover if you do not raise a problem.
          </p>
          <BuyerOrderActions
            orderId={order.id}
            canConfirm={canConfirm}
            canReport={canReport}
          />
        </section>
      )}

      {!canConfirm && canReport && (
        <section className="rounded-[20px] bg-[var(--color-pure-white)] p-5">
          <BuyerOrderActions
            orderId={order.id}
            canConfirm={false}
            canReport={canReport}
          />
        </section>
      )}

      {!canReport && (
        <section className="rounded-[20px] bg-[var(--color-canvas-mist)] p-5 text-[12px] leading-relaxed text-[var(--color-ash-veil)]">
          Need help with this order?{" "}
          <Link href="/help" className="font-semibold text-[var(--color-shop-violet)]">
            Contact Pantaker support
          </Link>
          .
        </section>
      )}

      <section className="rounded-[20px] bg-[var(--color-pure-white)] p-5">
        <h2 className="text-[12px] font-semibold tracking-[0.12em] text-[var(--color-ash-veil)] uppercase">
          Order activity
        </h2>
        <ol className="mt-4 flex flex-col gap-4">
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
                <p className="mt-0.5 text-[11px] text-[var(--color-ash-veil)]">
                  {formatAdminDateTime(event.created_at)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <p className="text-[11px] leading-relaxed text-[var(--color-ash-veil)]">
        Payments are processed by Bachs. Pantaker holds the seller&apos;s share
        until handover, then pays the seller after the protection window.
      </p>
    </div>
  );
}

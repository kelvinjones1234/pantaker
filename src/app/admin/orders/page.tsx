import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminPermission } from "@/features/admin/authorization";
import { getAdminOrders } from "@/features/orders/queries";
import { OrderStatusPill } from "@/components/orders/OrderStatusPill";
import { SellerPageHeader } from "@/components/seller/SellerPageHeader";
import { formatKobo } from "@/lib/bachs/money";
import { formatAdminDateTime } from "@/lib/datetime";

export const metadata = {
  title: "Orders — Pantaker Admin",
  robots: { index: false, follow: false },
};

export default async function AdminOrdersPage() {
  await requireAdminPermission("payments.manage", "/admin/orders");
  const orders = await getAdminOrders();

  return (
    <div className="flex flex-col gap-6">
      <SellerPageHeader
        title="Online orders"
        description="Buyer-protected payments, handovers, seller releases, refunds, and disputes."
      />

      {orders.length === 0 ? (
        <p className="rounded-[20px] bg-[var(--color-pure-white)] p-6 text-sm text-[var(--color-ash-veil)]">
          No online orders yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/admin/orders/${order.id}`}
                className="block rounded-[20px] bg-[var(--color-pure-white)] p-5 transition-colors duration-150 hover:bg-[var(--color-canvas-mist)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-[var(--color-ink-black)]">
                      {order.order_number} · {order.item_title}
                    </p>
                    <p className="mt-1 text-[12px] text-[var(--color-muted-gray)]">
                      {formatKobo(order.item_amount_kobo)} · buyer{" "}
                      {order.buyer_name ?? order.buyer_email ?? "—"} · seller{" "}
                      {order.seller_name ?? "—"}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[var(--color-ash-veil)]">
                      {formatAdminDateTime(order.created_at)}
                    </p>
                  </div>
                  <OrderStatusPill status={order.status} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { PackageIcon } from "@/components/brand/icons";
import { OrderStatusPill } from "@/components/orders/OrderStatusPill";
import { SellerEmptyState } from "@/components/seller/SellerEmptyState";
import { SellerPageHeader } from "@/components/seller/SellerPageHeader";
import { getSellerOrders } from "@/features/orders/queries";
import { formatKobo } from "@/lib/bachs/money";
import { formatAdminDate } from "@/lib/datetime";

export const metadata: Metadata = {
  title: "Online orders — Pantaker",
  description: "Buyer-protected orders paid through Pantaker.",
};

export default async function SellerOrdersPage() {
  const orders = await getSellerOrders();

  return (
    <div className="flex flex-col gap-6">
      <SellerPageHeader
        title="Online orders"
        description="Paid through Pantaker. Hand over the item with the buyer's pickup code, then your share is paid after the 72-hour protection window."
      >
        <Link
          href="/seller/sales"
          className="inline-flex h-11 items-center justify-center rounded-full bg-[var(--color-canvas-mist)] px-4 text-xs font-semibold text-[var(--color-ink-black)] transition-colors duration-150 hover:bg-[var(--color-primary-tint)]"
        >
          Manual sales
        </Link>
      </SellerPageHeader>

      {orders.length === 0 ? (
        <SellerEmptyState
          icon={<PackageIcon className="h-6 w-6 text-[var(--color-shop-violet)]" />}
          heading="No online orders yet"
          copy="When a buyer pays for one of your fixed-price listings, the order appears here with its handover steps."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/seller/orders/${order.id}`}
                className="shop-card flex flex-col gap-3 p-5 transition-colors duration-150 hover:border-[var(--color-ink-30)] sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-semibold text-[var(--color-ink-black)]">
                    {order.item_title}
                  </p>
                  <p className="mt-1 text-[12px] text-[var(--color-muted-gray)]">
                    {order.order_number} · {order.buyer_name ?? "Buyer"} ·{" "}
                    {formatAdminDate(order.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[13px] font-semibold text-[var(--color-ink-black)]">
                    {formatKobo(order.seller_share_kobo)}
                  </span>
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

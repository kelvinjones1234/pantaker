import type { Metadata } from "next";
import Link from "next/link";
import { ReceiptIcon } from "@/components/brand/icons";
import { OrderStatusPill } from "@/components/orders/OrderStatusPill";
import { SellerEmptyState } from "@/components/seller/SellerEmptyState";
import { SellerPageHeader } from "@/components/seller/SellerPageHeader";
import { requireUser } from "@/features/auth/authorization";
import { getBuyerOrders } from "@/features/orders/queries";
import { formatKobo } from "@/lib/bachs/money";
import { formatAdminDate } from "@/lib/datetime";

export const metadata: Metadata = {
  title: "Your orders — Pantaker",
  description: "Track purchases protected by Pantaker until you collect them.",
};

export default async function BuyerOrdersPage() {
  await requireUser("/orders");
  const orders = await getBuyerOrders();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <SellerPageHeader
        title="Your orders"
        description="Pantaker holds your payment until you collect the item. If something is wrong, pause the payout from the order page."
      />

      {orders.length === 0 ? (
        <SellerEmptyState
          icon={<ReceiptIcon className="h-6 w-6 text-[var(--color-shop-violet)]" />}
          heading="No orders yet"
          copy="When you buy a fixed-price item with online checkout, it will appear here with its pickup code and payment status."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/orders/${order.id}`}
                className="block rounded-[20px] bg-[var(--color-pure-white)] p-5 transition-colors duration-200 hover:bg-[var(--color-canvas-mist)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold text-[var(--color-ink-black)]">
                      {order.item_title}
                    </p>
                    <p className="mt-1 text-[12px] text-[var(--color-ash-veil)]">
                      {order.order_number} · {formatAdminDate(order.created_at)} ·{" "}
                      {formatKobo(order.item_amount_kobo)}
                    </p>
                  </div>
                  <OrderStatusPill status={order.status} />
                </div>
                <p className="mt-3 text-[12px] text-[var(--color-ash-veil)]">
                  Seller: {order.seller_name ?? "Pantaker seller"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

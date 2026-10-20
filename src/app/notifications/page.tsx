import type { Metadata } from "next";
import Link from "next/link";
import { BellIcon } from "@/components/brand/icons";
import { requireUser } from "@/features/auth/authorization";
import { getNotifications } from "@/features/notifications/queries";
import { NotificationList } from "@/components/notifications/NotificationList";
import { SellerEmptyState } from "@/components/seller/SellerEmptyState";
import { SellerPageHeader } from "@/components/seller/SellerPageHeader";

export const metadata: Metadata = {
  title: "Notifications — Pantaker",
  description: "Approvals, messages, and sale updates on your Pantaker account.",
};

export default async function NotificationsPage() {
  await requireUser("/notifications");
  const items = await getNotifications();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center gap-4 text-[12px] font-semibold">
        <Link
          href="/marketplace"
          className="text-[var(--color-shop-violet)] transition-colors duration-150 hover:text-[var(--color-primary-hover)]"
        >
          ← Marketplace
        </Link>
        <Link
          href="/seller"
          className="text-[var(--color-shop-violet)] transition-colors duration-150 hover:text-[var(--color-primary-hover)]"
        >
          Seller Centre
        </Link>
      </div>

      <SellerPageHeader
        title="Notifications"
        description="Approvals, messages, and sale updates for your account. Everything here is in-app — Pantaker doesn't send email or push yet."
      />

      {items.length === 0 ? (
        <SellerEmptyState
          icon={<BellIcon className="h-6 w-6 text-[var(--color-shop-violet)]" />}
          heading="No notifications yet"
          copy="When a listing is approved or needs changes, a buyer messages you, or a sale changes status, it will show up here."
        />
      ) : (
        <NotificationList items={items} />
      )}
    </div>
  );
}

import Link from "next/link";
import { requireSeller } from "@/features/auth/authorization";
import { getAccountAccessState } from "@/features/accounts/access";
import { getUnreadMessageCount } from "@/features/messaging/queries";
import { getUnreadNotificationCount } from "@/features/notifications/queries";
import { Logo } from "@/components/brand/Logo";
import { SellerSidebar } from "@/components/seller/SellerSidebar";
import { SellerMobileNav } from "@/components/seller/SellerMobileNav";
import { BellIcon, PlusIcon, ShieldIcon } from "@/components/brand/icons";
import { isAdminUser } from "@/features/admin/roles";

/**
 * Server-side gate for the private seller area: authentication is enforced
 * before any child renders. The shell provides the desktop rail and the mobile
 * bottom dock; guests are redirected to sign-in (local preview renders without a
 * session).
 */
export default async function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireSeller("/seller");
  const isAdmin = isAdminUser(user);
  const [{ status: accountStatus }, unreadMessages, unreadNotifications] =
    await Promise.all([
      getAccountAccessState(),
      getUnreadMessageCount("seller"),
      getUnreadNotificationCount(),
    ]);

  return (
    <div className="min-h-screen bg-[var(--shop-canvas)] text-[var(--color-ink-black)]">
      <div className="mx-auto flex w-full max-w-[1200px]">
        <SellerSidebar
          email={user?.email}
          isAdmin={isAdmin}
          unreadMessages={unreadMessages}
          unreadNotifications={unreadNotifications}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex items-center justify-between gap-3 bg-[var(--color-pure-white)] px-4 py-3 lg:hidden">
            <Link href="/" aria-label="Pantaker home">
              <Logo compact />
            </Link>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Link
                  href="/admin"
                  aria-label="Open admin"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-canvas-mist)] text-[var(--color-ink-black)] transition-colors duration-150 hover:bg-[var(--color-primary-tint)]"
                >
                  <ShieldIcon className="h-4 w-4" />
                </Link>
              )}
              <Link
                href="/notifications"
                aria-label={
                  unreadNotifications > 0
                    ? `Notifications, ${unreadNotifications} unread`
                    : "Notifications"
                }
                className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-canvas-mist)] text-[var(--color-ink-black)] transition-colors duration-150 hover:bg-[var(--color-primary-tint)]"
              >
                <BellIcon className="h-4 w-4" />
                {unreadNotifications > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-shop-violet)] px-1 text-[10px] font-semibold text-[var(--color-pure-white)]">
                    {unreadNotifications}
                  </span>
                )}
              </Link>
              <Link
                href="/sell"
                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[var(--color-shop-violet)] px-4 text-xs font-semibold text-[var(--color-pure-white)] transition-colors duration-150 hover:bg-[var(--color-primary-hover)]"
              >
                <PlusIcon className="h-3.5 w-3.5" />
                List an item
              </Link>
            </div>
          </header>

          <main className="flex-1 px-4 pb-24 pt-6 sm:px-6 lg:pb-12 lg:pt-8">
            {accountStatus === "restricted" && (
              <div
                role="status"
                className="mb-5 rounded-[20px] bg-[var(--color-warning-bg)] px-4 py-3 text-[12px] leading-relaxed text-[var(--color-warning)]"
              >
                Your account is restricted. You can browse and read messages,
                but listing, messaging, and sales actions stay unavailable until
                a Pantaker admin lifts the restriction.
              </div>
            )}
            {children}
          </main>
        </div>
      </div>

      <SellerMobileNav unreadMessages={unreadMessages} />
    </div>
  );
}

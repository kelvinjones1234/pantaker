"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import {
  ChatIcon,
  LogoutIcon,
  PlusIcon,
  ShieldIcon,
} from "@/components/brand/icons";
import { cn } from "@/lib/utils";
import { SELLER_NAV, isSellerNavActive } from "@/components/seller/seller-nav";

/**
 * Persistent left rail for the Seller Centre (desktop). The active item fills
 * with the mist canvas at a 20px radius, matching the Shop sidebar spec.
 */
export function SellerSidebar({
  email,
  isAdmin = false,
  unreadMessages = 0,
  unreadNotifications = 0,
}: {
  email?: string | null;
  isAdmin?: boolean;
  unreadMessages?: number;
  unreadNotifications?: number;
}) {
  const pathname = usePathname();

  const badgeCountFor = (item: (typeof SELLER_NAV)[number]) => {
    if (item.badgeKey === "messages") return unreadMessages;
    if (item.badgeKey === "notifications") return unreadNotifications;
    return 0;
  };

  return (
    <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col gap-6 bg-[var(--color-pure-white)] px-4 py-6 lg:flex">
      <Link href="/" aria-label="Pantaker home" className="px-2">
        <Logo />
      </Link>

      <nav aria-label="Seller Centre" className="flex flex-col gap-1">
        {SELLER_NAV.map((item) => {
          const active = isSellerNavActive(pathname, item);
          const Icon = item.icon;
          const badgeCount = badgeCountFor(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-[20px] px-3 py-2.5 text-sm font-medium transition-colors duration-150",
                active
                  ? "bg-[var(--color-canvas-mist)] text-[var(--color-ink-black)]"
                  : "text-[var(--color-muted-gray)] hover:bg-[var(--color-canvas-mist)] hover:text-[var(--color-ink-black)]",
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="flex-1">{item.label}</span>
              {badgeCount > 0 && (
                <span
                  className="rounded-full bg-[var(--color-shop-violet)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-pure-white)]"
                  aria-label={`${badgeCount} unread ${item.label.toLowerCase()}`}
                >
                  {badgeCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <Link
        href="/sell"
        className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[var(--color-shop-violet)] px-5 text-sm font-semibold text-[var(--color-pure-white)] transition-colors duration-200 hover:bg-[var(--color-primary-hover)]"
      >
        <PlusIcon className="h-4 w-4" />
        List an item
      </Link>

      <nav aria-label="Other areas" className="flex flex-col gap-1">
        <Link
          href="/messages"
          className="flex items-center gap-3 rounded-[20px] px-3 py-2.5 text-sm font-medium text-[var(--color-muted-gray)] transition-colors duration-150 hover:bg-[var(--color-canvas-mist)] hover:text-[var(--color-ink-black)]"
        >
          <ChatIcon className="h-5 w-5" />
          Buying messages
        </Link>
        {isAdmin && (
          <Link
            href="/admin"
            className="flex items-center gap-3 rounded-[20px] px-3 py-2.5 text-sm font-medium text-[var(--color-muted-gray)] transition-colors duration-150 hover:bg-[var(--color-canvas-mist)] hover:text-[var(--color-ink-black)]"
          >
            <ShieldIcon className="h-5 w-5" />
            Admin
          </Link>
        )}
      </nav>

      <div className="mt-auto rounded-[20px] bg-[var(--color-canvas-mist)] p-3">
        {email ? (
          <p
            className="truncate text-[12px] text-[var(--color-ash-veil)]"
            title={email}
          >
            Signed in as{" "}
            <span className="font-semibold text-[var(--color-ink-black)]">
              {email}
            </span>
          </p>
        ) : (
          <p className="text-[12px] text-[var(--color-ash-veil)]">
            Preview mode — not signed in.
          </p>
        )}
        <form action="/auth/signout" method="post" className="mt-2">
          <button
            type="submit"
            className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[var(--color-pure-white)] px-4 py-2 text-xs font-semibold text-[var(--color-ink-black)] transition-colors duration-150 hover:bg-[var(--color-canvas-mist)]"
          >
            <LogoutIcon className="h-4 w-4" />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}

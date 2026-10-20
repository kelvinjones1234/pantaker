"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PlusIcon } from "@/components/brand/icons";
import { cn } from "@/lib/utils";
import { sellerNavForMobile, isSellerNavActive } from "@/components/seller/seller-nav";

/**
 * Bottom dock for the Seller Centre on small screens. Mirrors the desktop rail;
 * the primary "List" action sits in the middle so it is always reachable.
 */
export function SellerMobileNav({ unreadMessages = 0 }: { unreadMessages?: number }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Seller Centre"
      className="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around gap-1 bg-[var(--shop-glass)] px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1.5 backdrop-blur-md lg:hidden"
    >
      {sellerNavForMobile().map((item) => {
        const active = isSellerNavActive(pathname, item);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 rounded-[16px] px-2 py-1.5 text-[11px] font-medium transition-colors duration-150",
              active ? "text-[var(--color-ink-black)]" : "text-[var(--color-ash-veil)]",
            )}
          >
            <span className="relative">
              <Icon className="h-5 w-5" />
              {item.badgeKey === "messages" && unreadMessages > 0 && (
                <span
                  className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-shop-violet)] px-1 text-[10px] font-semibold text-[var(--color-pure-white)]"
                  aria-label={`${unreadMessages} unread messages`}
                >
                  {unreadMessages}
                </span>
              )}
            </span>
            {item.shortLabel ?? item.label}
          </Link>
        );
      })}
      <Link
        href="/sell"
        className="flex flex-1 flex-col items-center gap-1 rounded-[16px] px-2 py-1.5 text-[11px] font-semibold text-[var(--color-shop-violet)]"
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-shop-violet)] text-[var(--color-pure-white)]">
          <PlusIcon className="h-3.5 w-3.5" />
        </span>
        List
      </Link>
    </nav>
  );
}

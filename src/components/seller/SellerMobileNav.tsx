"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { sellerNavForMobile, isSellerNavActive } from "@/components/seller/seller-nav";

const unreadLabel = (count: number) => (count > 9 ? "9+" : String(count));

/**
 * Bottom dock for the Dashboard on small screens. Mirrors the desktop rail;
 * listing creation stays in the sticky mobile header so the dock keeps five
 * comfortable targets.
 */
export function SellerMobileNav({ unreadMessages = 0 }: { unreadMessages?: number }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Dashboard"
      className="fixed inset-x-0 bottom-0 z-40 flex items-stretch gap-1 bg-[var(--shop-glass)] px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1.5 backdrop-blur-md lg:hidden"
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
              "flex min-h-12 flex-1 basis-0 flex-col items-center justify-center gap-1 rounded-[16px] px-1 py-1.5 text-xs font-medium transition-colors duration-150",
              active
                ? "bg-[var(--color-canvas-mist)] text-[var(--color-ink-black)]"
                : "text-[var(--color-ash-veil)] hover:bg-[var(--color-canvas-mist)]",
            )}
          >
            <span className="relative">
              <Icon className="h-5 w-5" />
              {item.badgeKey === "messages" && unreadMessages > 0 && (
                <span
                  className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-shop-violet)] px-1 text-[10px] font-semibold text-[var(--color-pure-white)]"
                  aria-label={`${unreadMessages} unread messages`}
                >
                  {unreadLabel(unreadMessages)}
                </span>
              )}
            </span>
            {item.shortLabel ?? item.label}
          </Link>
        );
      })}
    </nav>
  );
}

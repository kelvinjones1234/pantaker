"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { SETTINGS_GROUPS, isSettingsGroupActive } from "@/components/seller/settings-nav";

/**
 * Section switcher for the Settings area. Scrolls horizontally on small screens
 * so the whole row stays reachable without wrapping; hidden on the index, which
 * already lists every group as a card.
 */
export function SettingsSubnav() {
  const pathname = usePathname();
  if (pathname === "/seller/settings") return null;

  return (
    <nav
      aria-label="Settings sections"
      className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
    >
      {SETTINGS_GROUPS.map((group) => {
        const active = isSettingsGroupActive(pathname, group.href);
        return (
          <Link
            key={group.href}
            href={group.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex shrink-0 items-center rounded-full px-4 py-2 text-xs font-semibold transition-colors duration-150",
              active
                ? "bg-[var(--color-shop-violet)] text-[var(--color-pure-white)]"
                : "border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] text-[var(--color-ink-black)] hover:border-[var(--color-ink-30)]",
            )}
          >
            {group.label}
          </Link>
        );
      })}
    </nav>
  );
}

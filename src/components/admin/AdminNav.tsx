"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { AdminPermission } from "@/features/admin/roles";
import { adminNavFor, isAdminNavActive } from "@/components/admin/admin-nav";

/**
 * Shared admin navigation. A horizontal, scrollable tab strip keeps every
 * section reachable on small screens without a separate drawer.
 */
export function AdminNav({
  permissions,
}: {
  permissions: readonly AdminPermission[];
}) {
  const pathname = usePathname();
  const items = adminNavFor(permissions);

  return (
    <div className="border-b border-[var(--color-faint-border)] bg-[var(--color-pure-white)]">
      <nav
        aria-label="Admin sections"
        className="scrollbar-none mx-auto flex w-full max-w-[1200px] gap-2 overflow-x-auto px-4 py-3 sm:px-6"
      >
        {items.map((item) => {
          const active = isAdminNavActive(pathname, item);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors duration-150",
                active
                  ? "bg-[var(--color-shop-violet)] text-[var(--color-pure-white)]"
                  : "bg-[var(--color-canvas-mist)] text-[var(--color-ink-black)] hover:bg-[var(--color-primary-tint)]",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

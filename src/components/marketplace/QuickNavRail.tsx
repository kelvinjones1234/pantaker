import Link from "next/link";
import { UserIcon } from "@/components/brand/icons";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const mobileNavItemClass =
  "flex min-h-12 flex-1 basis-0 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-[14px] px-1 text-xs font-medium text-[var(--color-ash-veil)] transition-colors duration-200 hover:text-[var(--color-ink-black)] data-[active=true]:bg-[var(--color-canvas-mist)] data-[active=true]:text-[var(--color-ink-black)]";

export function MobileQuickNav({ children }: { children: ReactNode }) {
  return (
    <nav
      aria-label="Mobile quick navigation"
      className="fixed inset-x-0 bottom-0 z-50 flex items-stretch gap-1 border-t border-[var(--color-faint-border)] bg-[var(--overlay-paper-95)] px-2 pt-2 backdrop-blur-md lg:hidden"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
    >
      {children}
    </nav>
  );
}

export function MobileProfileLink({
  user = null,
}: {
  user?: { email?: string | null } | null;
}) {
  return (
    <Link
      href={user ? "/seller" : "/login?next=/seller"}
      aria-label={user ? "Open profile" : "Sign in to Pantaker"}
      className={mobileNavItemClass}
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-shop-violet)] text-[11px] font-semibold text-[var(--color-pure-white)]">
        {user?.email?.[0]?.toUpperCase() ?? <UserIcon className="h-4 w-4" />}
      </span>
      <span>Profile</span>
    </Link>
  );
}

export function QuickNavRail({
  user = null,
  children,
  className,
}: {
  user?: { email?: string | null } | null;
  children: ReactNode;
  className?: string;
}) {
  return (
    <aside
      className={cn(
        "pointer-events-none fixed left-5 top-1/2 z-50 hidden -translate-y-1/2 flex-col items-center gap-3.5 lg:flex",
        className,
      )}
      aria-label="Quick navigation"
    >
      <div className="pointer-events-auto flex flex-col items-center gap-5 rounded-full bg-[var(--color-pure-white)] px-2.5 py-4">
        {children}
      </div>
      <div className="pointer-events-auto flex flex-col items-center gap-3 rounded-full bg-[var(--color-pure-white)] px-2.5 py-3">
        <Link
          href={user ? "/seller" : "/login?next=/seller"}
          aria-label={user ? "Open seller dashboard" : "Sign in to Pantaker"}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-shop-violet)] text-sm font-semibold tracking-wide text-[var(--color-pure-white)] ring-1 ring-[var(--color-faint-border)] transition-opacity duration-200 hover:opacity-90"
        >
          {user?.email?.[0]?.toUpperCase() ?? (
            <UserIcon className="h-4 w-4" />
          )}
        </Link>
      </div>
    </aside>
  );
}

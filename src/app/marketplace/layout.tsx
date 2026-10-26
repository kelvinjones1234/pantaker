import Link from "next/link";
import { MarketplaceHeader } from "@/components/marketplace/MarketplaceHeader";
import { getAuthUser } from "@/features/auth/queries";
import { isAdminUser } from "@/features/admin/roles";

export default async function MarketplaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthUser().catch(() => null);

  return (
    <div className="min-h-screen bg-[var(--shop-canvas)] text-[var(--color-ink-black)]">
      <MarketplaceHeader
        user={user ? { email: user.email, isAdmin: isAdminUser(user) } : null}
      />
      {children}
      <footer className="mt-12 border-t border-[var(--color-faint-border)]">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col items-center justify-between gap-3 px-4 py-8 text-[12px] text-[var(--color-ash-veil)] sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[var(--color-ink-black)]">
              Pantaker
            </span>
            <span aria-hidden="true">•</span>
            <span>Abuja, FCT</span>
            <span aria-hidden="true">•</span>
            <span>© 2026 Pantaker</span>
          </div>
          <nav
            className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2"
            aria-label="Footer"
          >
            <Link
              href="/marketplace"
              className="transition-colors duration-150 hover:text-[var(--color-ink-black)]"
            >
              Browse
            </Link>
            <Link
              href="/#how"
              className="transition-colors duration-150 hover:text-[var(--color-ink-black)]"
            >
              How it works
            </Link>
            <Link
              href="/sell"
              className="transition-colors duration-150 hover:text-[var(--color-ink-black)]"
            >
              Sell an item
            </Link>
            <Link
              href="/help"
              className="transition-colors duration-150 hover:text-[var(--color-ink-black)]"
            >
              Help
            </Link>
            <Link
              href="/privacy"
              className="transition-colors duration-150 hover:text-[var(--color-ink-black)]"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="transition-colors duration-150 hover:text-[var(--color-ink-black)]"
            >
              Terms
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

import Link from "next/link";
import { MarketplaceHeader } from "@/components/marketplace/MarketplaceHeader";

export default function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--shop-canvas)] text-[var(--color-ink-black)]">
      <MarketplaceHeader />
      {children}
      <footer className="mt-12 border-t border-[var(--color-faint-border)]">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col items-center justify-between gap-3 px-4 py-8 text-[12px] text-[var(--color-ash-veil)] sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[var(--color-ink-black)]">Pantaker</span>
            <span aria-hidden="true">•</span>
            <span>Abuja, FCT</span>
            <span aria-hidden="true">•</span>
            <span>© 2026 Pantaker</span>
          </div>
          <nav className="flex items-center gap-6" aria-label="Footer">
            <Link href="/marketplace" className="transition-colors duration-150 hover:text-[var(--color-ink-black)]">
              Browse
            </Link>
            <Link href="/#how" className="transition-colors duration-150 hover:text-[var(--color-ink-black)]">
              How it works
            </Link>
            <Link href="/sell" className="transition-colors duration-150 hover:text-[var(--color-ink-black)]">
              Sell an item
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

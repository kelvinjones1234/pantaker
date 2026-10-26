import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

/** Shared frame for public information pages: help, privacy, and marketplace rules. */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--shop-canvas)] text-[var(--color-ink-black)]">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/" aria-label="Pantaker home">
            <Logo />
          </Link>
          <Link
            href="/marketplace"
            className="text-[13px] font-semibold text-[var(--color-shop-violet)] underline-offset-4 hover:underline"
          >
            Browse marketplace
          </Link>
        </header>

        {children}

        <nav
          aria-label="Public pages"
          className="flex flex-wrap items-center gap-x-5 gap-y-2 px-1 text-[12px] text-[var(--color-ash-veil)]"
        >
          <Link href="/" className="hover:text-[var(--color-ink-black)]">
            Home
          </Link>
          <Link href="/help" className="hover:text-[var(--color-ink-black)]">
            Help and safety
          </Link>
          <Link href="/privacy" className="hover:text-[var(--color-ink-black)]">
            Privacy notice
          </Link>
          <Link href="/terms" className="hover:text-[var(--color-ink-black)]">
            Marketplace rules
          </Link>
        </nav>
      </div>
    </div>
  );
}

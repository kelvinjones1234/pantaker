import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

export const metadata: Metadata = {
  title: "Account suspended — Pantaker",
  description: "This Pantaker account cannot be used right now.",
  robots: { index: false, follow: false },
};

export default function AccountSuspendedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--shop-canvas)] px-4 py-12">
      <div className="shop-card w-full max-w-lg p-8 text-center">
        <div className="flex justify-center">
          <Logo />
        </div>
        <h1 className="mt-6 font-brand-serif text-2xl font-bold tracking-tight text-[var(--color-ink-black)]">
          Account suspended
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-[var(--color-muted-gray)]">
          This account cannot sign in or use Pantaker right now. If you think this is a
          mistake, contact Pantaker support.
        </p>

        <div className="mt-7 flex flex-col items-center justify-center gap-2 sm:flex-row">
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full bg-[var(--color-shop-violet)] px-5 text-sm font-semibold text-[var(--color-pure-white)] transition-colors duration-150 hover:bg-[var(--color-primary-hover)]"
            >
              Sign out
            </button>
          </form>
          <Link
            href="/help"
            className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] px-5 text-sm font-semibold text-[var(--color-ink-black)] transition-colors duration-150 hover:border-[var(--color-ink-30)]"
          >
            Contact support
          </Link>
        </div>
      </div>
    </main>
  );
}

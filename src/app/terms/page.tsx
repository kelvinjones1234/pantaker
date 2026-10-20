import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Marketplace rules — Pantaker",
  description: "The rules for listing, buying, and communicating on Pantaker.",
};

export default function TermsPage() {
  const email = siteConfig.supportEmail;

  return (
    <main className="min-h-screen bg-[var(--shop-canvas)] px-4 py-10 sm:px-6">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <Link href="/" aria-label="Pantaker home">
            <Logo />
          </Link>
          <Link
            href="/help"
            className="text-[13px] font-semibold text-[var(--color-shop-violet)] underline-offset-4 hover:underline"
          >
            Help and safety
          </Link>
        </div>

        <header className="shop-card p-6 sm:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ash-veil)]">
            Marketplace rules
          </p>
          <h1 className="mt-2 font-brand-serif text-3xl font-bold tracking-tight text-[var(--color-ink-black)]">
            Rules for using Pantaker
          </h1>
          <p className="mt-3 max-w-[60ch] text-[14px] leading-relaxed text-[var(--color-ash-veil)]">
            These rules keep Pantaker useful and safe. Using the marketplace means following them.
          </p>
        </header>

        <section className="shop-card p-6 sm:p-8">
          <h2 className="font-brand-serif text-xl font-bold tracking-tight text-[var(--color-ink-black)]">
            Accounts
          </h2>
          <div className="mt-3 flex max-w-[60ch] flex-col gap-3 text-[13px] leading-relaxed text-[var(--color-ink-black)]">
            <p>Use accurate account and listing details. Do not impersonate another person or business.</p>
            <p>You are responsible for activity under your account and for keeping your sign-in secure.</p>
            <p>Pantaker may restrict or suspend accounts that break these rules or create a safety risk.</p>
          </div>
        </section>

        <section className="shop-card p-6 sm:p-8">
          <h2 className="font-brand-serif text-xl font-bold tracking-tight text-[var(--color-ink-black)]">
            Listings
          </h2>
          <div className="mt-3 flex max-w-[60ch] flex-col gap-3 text-[13px] leading-relaxed text-[var(--color-ink-black)]">
            <p>Describe the item honestly, including condition and quantity, and use photos of the actual item.</p>
            <p>List only items you are allowed to sell and can hand over lawfully.</p>
            <p>
              Prohibited items include stolen goods, weapons, illegal drugs, live animals, human
              remains, counterfeit goods, and anything unsafe to handle or transport.
            </p>
            <p>Listings are reviewed before publication. Editing a live listing sends it back to review.</p>
          </div>
        </section>

        <section className="shop-card p-6 sm:p-8">
          <h2 className="font-brand-serif text-xl font-bold tracking-tight text-[var(--color-ink-black)]">
            Buying and selling
          </h2>
          <div className="mt-3 flex max-w-[60ch] flex-col gap-3 text-[13px] leading-relaxed text-[var(--color-ink-black)]">
            <p>
              Pantaker is a marketplace for connecting buyers and sellers. It does not process
              payments, hold funds, verify ownership, or arrange delivery.
            </p>
            <p>Buyers and sellers agree the price, inspection, and handover directly. Inspect before paying.</p>
            <p>Do not use Pantaker messages to harass, spam, or send fraudulent payment requests.</p>
          </div>
        </section>

        <section className="shop-card p-6 sm:p-8">
          <h2 className="font-brand-serif text-xl font-bold tracking-tight text-[var(--color-ink-black)]">
            Reports and enforcement
          </h2>
          <div className="mt-3 flex max-w-[60ch] flex-col gap-3 text-[13px] leading-relaxed text-[var(--color-ink-black)]">
            <p>Reports are reviewed by Pantaker moderators. Deliberately false reports are not allowed.</p>
            <p>We may remove listings, restrict accounts, or preserve records where needed to handle abuse.</p>
            <p>
              {email ? (
                <>
                  To ask a question or report something you cannot flag in the app, email{" "}
                  <a
                    href={`mailto:${email}`}
                    className="font-semibold text-[var(--color-shop-violet)] underline-offset-4 hover:underline"
                  >
                    {email}
                  </a>
                  .
                </>
              ) : (
                <>Support contact details are not configured for this deployment.</>
              )}
            </p>
          </div>
        </section>

        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 px-1 text-[12px] text-[var(--color-ash-veil)]">
          <Link href="/" className="hover:text-[var(--color-ink-black)]">
            Home
          </Link>
          <Link href="/help" className="hover:text-[var(--color-ink-black)]">
            Help and safety
          </Link>
          <Link href="/privacy" className="hover:text-[var(--color-ink-black)]">
            Privacy notice
          </Link>
        </nav>
      </div>
    </main>
  );
}

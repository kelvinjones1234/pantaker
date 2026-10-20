import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Help and safety — Pantaker",
  description: "How Pantaker works, how to stay safe when buying or selling, and how to contact support.",
};

export default function HelpPage() {
  const email = siteConfig.supportEmail;

  return (
    <main className="min-h-screen bg-[var(--shop-canvas)] px-4 py-10 sm:px-6">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <Link href="/" aria-label="Pantaker home">
            <Logo />
          </Link>
          <Link
            href="/marketplace"
            className="text-[13px] font-semibold text-[var(--color-shop-violet)] underline-offset-4 hover:underline"
          >
            Browse marketplace
          </Link>
        </div>

        <header className="shop-card p-6 sm:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ash-veil)]">
            Pantaker help
          </p>
          <h1 className="mt-2 font-brand-serif text-3xl font-bold tracking-tight text-[var(--color-ink-black)]">
            Help and safety
          </h1>
          <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-[var(--color-ash-veil)]">
            Pantaker connects people with unwanted items, scrap, and recoverable materials. Sellers
            list what they have; buyers message sellers and agree the handover directly.
          </p>
        </header>

        <section className="shop-card p-6 sm:p-8">
          <h2 className="font-brand-serif text-xl font-bold tracking-tight text-[var(--color-ink-black)]">
            How buying works
          </h2>
          <div className="mt-3 flex max-w-[60ch] flex-col gap-3 text-[13px] leading-relaxed text-[var(--color-ink-black)]">
            <p>Browse or search listings, open a listing, and send the seller a message.</p>
            <p>
              Agree the price, quantity, and collection point in the conversation. Inspect the item
              before you pay, and meet in a public place during daylight where possible.
            </p>
            <p>
              Pantaker does not process payments, hold funds, or arrange delivery. A sale is recorded
              by the seller after the handover is agreed.
            </p>
          </div>
        </section>

        <section className="shop-card p-6 sm:p-8">
          <h2 className="font-brand-serif text-xl font-bold tracking-tight text-[var(--color-ink-black)]">
            How selling works
          </h2>
          <div className="mt-3 flex max-w-[60ch] flex-col gap-3 text-[13px] leading-relaxed text-[var(--color-ink-black)]">
            <p>Create a listing with clear photos, an honest condition, and a real price.</p>
            <p>New and edited listings are reviewed before they appear in the marketplace.</p>
            <p>
              Keep conversations and handover arrangements inside Pantaker messages. Do not share
              bank details, passwords, or one-time codes with anyone.
            </p>
          </div>
        </section>

        <section className="shop-card p-6 sm:p-8">
          <h2 className="font-brand-serif text-xl font-bold tracking-tight text-[var(--color-ink-black)]">
            Report a problem
          </h2>
          <div className="mt-3 flex max-w-[60ch] flex-col gap-3 text-[13px] leading-relaxed text-[var(--color-ink-black)]">
            <p>
              Use the report control on a listing or conversation to flag prohibited items, scams,
              harassment, or unsafe behaviour. Reports go to Pantaker moderators, not to the person
              you reported.
            </p>
            <p>
              If someone asks you to move a deal off Pantaker, pay before inspecting, or share
              account security details, stop and report it.
            </p>
          </div>
        </section>

        <section className="shop-card p-6 sm:p-8">
          <h2 className="font-brand-serif text-xl font-bold tracking-tight text-[var(--color-ink-black)]">
            Contact support
          </h2>
          <p className="mt-3 text-[13px] leading-relaxed text-[var(--color-ink-black)]">
            {email ? (
              <>
                For account, privacy, or safety help, email{" "}
                <a
                  href={`mailto:${email}`}
                  className="font-semibold text-[var(--color-shop-violet)] underline-offset-4 hover:underline"
                >
                  {email}
                </a>
                . Include the listing link or account email so we can find the right record.
              </>
            ) : (
              <>Support contact details are not configured for this deployment.</>
            )}
          </p>
        </section>

        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 px-1 text-[12px] text-[var(--color-ash-veil)]">
          <Link href="/" className="hover:text-[var(--color-ink-black)]">
            Home
          </Link>
          <Link href="/privacy" className="hover:text-[var(--color-ink-black)]">
            Privacy notice
          </Link>
          <Link href="/terms" className="hover:text-[var(--color-ink-black)]">
            Marketplace rules
          </Link>
        </nav>
      </div>
    </main>
  );
}

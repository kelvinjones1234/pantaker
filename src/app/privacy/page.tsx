import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Privacy notice — Pantaker",
  description:
    "What Pantaker stores, why it stores it, and how account deletion works.",
};

export default function PrivacyPage() {
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
            Privacy
          </p>
          <h1 className="mt-2 font-brand-serif text-3xl font-bold tracking-tight text-[var(--color-ink-black)]">
            Privacy notice
          </h1>
          <p className="mt-3 max-w-[60ch] text-[14px] leading-relaxed text-[var(--color-ash-veil)]">
            This notice explains what Pantaker stores, why it is needed to run
            the marketplace, and the controls available to you. It applies to
            the Pantaker app and marketplace.
          </p>
        </header>

        <section className="shop-card p-6 sm:p-8">
          <h2 className="font-brand-serif text-xl font-bold tracking-tight text-[var(--color-ink-black)]">
            What we store
          </h2>
          <ul className="mt-3 flex max-w-[60ch] list-disc flex-col gap-2 pl-5 text-[13px] leading-relaxed text-[var(--color-ink-black)]">
            <li className="max-w-[60ch]">
              Account email and sign-in metadata stored in our database.
            </li>
            <li className="max-w-[60ch]">
              Profile details you choose to add, such as display name, username,
              area, and bio.
            </li>
            <li className="max-w-[60ch]">
              Listings, photos, prices, and collection notes you publish.
            </li>
            <li className="max-w-[60ch]">
              Messages, reports, seller-recorded sales, and in-app
              notifications.
            </li>
            <li className="max-w-[60ch]">
              Account restrictions and admin audit records kept for safety and
              accountability.
            </li>
          </ul>
        </section>

        <section className="shop-card p-6 sm:p-8">
          <h2 className="font-brand-serif text-xl font-bold tracking-tight text-[var(--color-ink-black)]">
            How it is used
          </h2>
          <div className="mt-3 flex max-w-[60ch] flex-col gap-3 text-[13px] leading-relaxed text-[var(--color-ink-black)]">
            <p>
              To show your listings, deliver messages, and let buyers and
              sellers coordinate.
            </p>
            <p>
              To review listings, handle reports, prevent abuse, and keep the
              marketplace safe.
            </p>
            <p>
              To send account and marketplace notifications you have not turned
              off.
            </p>
            <p>
              We do not sell personal data or run third-party advertising
              trackers.
            </p>
          </div>
        </section>

        <section className="shop-card p-6 sm:p-8">
          <h2 className="font-brand-serif text-xl font-bold tracking-tight text-[var(--color-ink-black)]">
            Who can see it
          </h2>
          <div className="mt-3 flex max-w-[60ch] flex-col gap-3 text-[13px] leading-relaxed text-[var(--color-ink-black)]">
            <p>
              Published listings are public. Your sign-in email is not shown to
              buyers. Buyers see the profile details that appear alongside a
              listing.
            </p>
            <p>
              Messages are visible to the buyer and seller in that conversation.
              Reports are visible to the reporter and to Pantaker moderators.
            </p>
            <p>
              Service providers host the app, database, email delivery, and
              listing photos: Supabase, our email provider, Cloudflare, and the
              deployment host. They process data on Pantaker&apos;s behalf.
            </p>
          </div>
        </section>

        <section className="shop-card p-6 sm:p-8">
          <h2 className="font-brand-serif text-xl font-bold tracking-tight text-[var(--color-ink-black)]">
            Retention and deletion
          </h2>
          <div className="mt-3 flex max-w-[60ch] flex-col gap-3 text-[13px] leading-relaxed text-[var(--color-ink-black)]">
            <p>
              Account data is kept while the account is active. You can request
              deletion from Settings → Account management. Deleting an account
              removes the Auth identity, profile, listings, photos, messages,
              reports, and recorded sales tied to it.
            </p>
            <p>
              Admin audit records can be retained after deletion because they
              are needed to account for moderation and access decisions. They do
              not contain your listing photos or message history.
            </p>
          </div>
        </section>

        <section className="shop-card p-6 sm:p-8">
          <h2 className="font-brand-serif text-xl font-bold tracking-tight text-[var(--color-ink-black)]">
            Your choices and contact
          </h2>
          <div className="mt-3 flex max-w-[60ch] flex-col gap-3 text-[13px] leading-relaxed text-[var(--color-ink-black)]">
            <p>
              You can edit your profile and listing preferences, turn off
              notification types, and request account deletion from Settings.
            </p>
            <p>
              {email ? (
                <>
                  For privacy questions or a correction request, email{" "}
                  <a
                    href={`mailto:${email}`}
                    className="font-semibold text-[var(--color-shop-violet)] underline-offset-4 hover:underline"
                  >
                    {email}
                  </a>
                  .
                </>
              ) : (
                <>
                  Support contact details are not configured for this
                  deployment.
                </>
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
          <Link href="/terms" className="hover:text-[var(--color-ink-black)]">
            Marketplace rules
          </Link>
        </nav>
      </div>
    </main>
  );
}

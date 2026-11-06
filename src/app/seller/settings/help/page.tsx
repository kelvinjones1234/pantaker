import type { Metadata } from "next";
import Link from "next/link";
import { requireSeller } from "@/features/auth/authorization";
import { SellerPageHeader } from "@/components/seller/SellerPageHeader";
import { SettingsCard } from "@/components/seller/SettingsCard";

export const metadata: Metadata = {
  title: "Help and support — Pantaker",
  description: "How listing review, enquiries, and account access work on Pantaker.",
};

const FAQS: Array<{ q: string; a: string }> = [
  {
    q: "Why isn't my listing visible in the marketplace?",
    a: "New listings go to pending review. They appear in the marketplace once they're approved, and a rejected listing stays in your My Listings with the rejection showing.",
  },
  {
    q: "How do buyers contact me?",
    a: "Buyers can send an enquiry from your listing. If you add a phone number or social handles to your profile, they also appear on every published listing so buyers can reach you directly. Those details are optional and hidden when left blank.",
  },
  {
    q: "How do I sign in?",
    a: "Enter your email and password. New accounts confirm the email address with a 6-digit code during sign-up.",
  },
  {
    q: "Can I delete a published listing?",
    a: "Archive it first, then delete it. This keeps a live listing from being removed by a single accidental tap.",
  },
  {
    q: "How do I close my account?",
    a: "Security has a permanent deletion flow that requires typing DELETE to confirm.",
  },
];

export default async function HelpSettingsPage() {
  await requireSeller("/seller/settings/help");

  return (
    <div className="flex flex-col gap-5">
      <SellerPageHeader
        title="Help and support"
        description="Short answers about how Pantaker selling works, plus where to get account and safety help."
      />

      <SettingsCard title="Common questions">
        <dl className="flex flex-col gap-5">
          {FAQS.map((item) => (
            <div key={item.q}>
              <dt className="text-[13px] font-semibold text-[var(--color-ink-black)]">{item.q}</dt>
              <dd className="mt-1 text-[12px] leading-relaxed text-[var(--color-muted-gray)]">
                {item.a}
              </dd>
            </div>
          ))}
        </dl>
      </SettingsCard>

      <SettingsCard
        title="Contact support"
        description="The public help page lists the support address and safety guidance."
      >
        <Link
          href="/help"
          className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] px-5 text-sm font-semibold text-[var(--color-ink-black)] transition-colors duration-150 hover:border-[var(--color-ink-30)]"
        >
          Open help and safety
        </Link>
      </SettingsCard>

      <SettingsCard
        title="Something looks wrong"
        description="Use the tools that already exist before emailing support."
      >
        <ul className="flex flex-col gap-3 text-[13px] leading-relaxed text-[var(--color-ink-black)]">
          <li>
            Report a listing from its page in the marketplace. Reports are stored with the listing and
            the reporter.
          </li>
          <li>
            If a listing of yours shows the wrong status, open{" "}
            <Link href="/seller/listings" className="font-semibold text-[var(--color-shop-violet)] underline">
              My Listings
            </Link>{" "}
            to check what actions are available for it.
          </li>
          <li>
            If you can&apos;t get into your account, sign in with your password on the{" "}
            <Link href="/login" className="font-semibold text-[var(--color-shop-violet)] underline">
              sign-in page
            </Link>
            .
          </li>
        </ul>
      </SettingsCard>
    </div>
  );
}

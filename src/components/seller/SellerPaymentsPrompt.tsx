import Link from "next/link";
import { ShieldIcon } from "@/components/brand/icons";

/**
 * Shown in Dashboard until the seller can receive buyer-protected payments.
 * Buyers never see Buy now for these sellers, so this is an actionable prompt,
 * not a passive warning.
 */
export function SellerPaymentsPrompt({
  configured,
  hasAccount,
  transfersActive,
}: {
  configured: boolean;
  hasAccount: boolean;
  transfersActive: boolean;
}) {
  if (transfersActive) return null;

  const title = configured
    ? hasAccount
      ? "Finish payment setup to sell online"
      : "Connect payments to sell online"
    : "Online checkout is not available yet";
  const message = configured
    ? hasAccount
      ? "Bachs still needs to verify one or more capabilities before buyers can pay online. Fixed-price listings stay visible, but the checkout button stays hidden until this is active."
      : "Bachs verifies sellers and sends your share to your Nigerian bank account. Set it up so buyers can pay online with Pantaker holding the money until handover."
    : "Pantaker is still configuring online payments for this environment. You can keep listing, but checkout will stay unavailable until it is enabled.";

  return (
    <section className="shop-card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-tint)] text-[var(--color-shop-violet)]">
          <ShieldIcon className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-[13px] font-semibold text-[var(--color-ink-black)]">
            {title}
          </h2>
          <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-[var(--color-ash-veil)]">
            {message}
          </p>
        </div>
      </div>
      <Link
        href="/seller/settings/payments"
        className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-[var(--color-shop-violet)] px-5 text-xs font-semibold text-[var(--color-pure-white)] transition-colors duration-200 hover:bg-[var(--color-primary-hover)]"
      >
        {hasAccount ? "Check payment status" : "Set up payments"}
      </Link>
    </section>
  );
}

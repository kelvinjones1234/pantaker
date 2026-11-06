"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  refreshPaymentAccountAction,
  requestSellerPayoutAction,
  startPaymentOnboardingAction,
  syncSellerBalanceAction,
} from "@/features/payments/actions";
import { formatKobo } from "@/lib/bachs/format";

interface Destination {
  id: string;
  bank_name?: string | null;
  account_name?: string | null;
  account_number_last4?: string | null;
}

export function StartOnboardingButton({
  label = "Start Bachs onboarding",
}: {
  label?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await startPaymentOnboardingAction();
            if (result.ok && result.url) {
              window.location.assign(result.url);
              return;
            }
            setError(result.ok ? "Onboarding did not open." : result.error);
          });
        }}
        className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full bg-[var(--color-shop-violet)] px-5 text-sm font-semibold text-[var(--color-pure-white)] transition-colors duration-200 hover:bg-[var(--color-primary-hover)] disabled:cursor-wait disabled:opacity-60"
      >
        {isPending ? "Opening Bachs…" : label}
      </button>
      {error && (
        <p role="alert" className="text-[12px] text-[var(--color-error)]">
          {error}
        </p>
      )}
    </div>
  );
}

export function RefreshPaymentStatusButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await syncSellerBalanceAction();
            const status = await refreshPaymentAccountAction();
            setMessage(
              result.ok
                ? status.ok
                  ? "Status refreshed."
                  : status.error
                : result.error,
            );
            router.refresh();
          })
        }
        className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full bg-[var(--color-canvas-mist)] px-4 text-xs font-semibold text-[var(--color-ink-black)] transition-colors duration-200 hover:bg-[var(--color-primary-tint)] disabled:cursor-wait disabled:opacity-60"
      >
        {isPending ? "Refreshing…" : "Refresh status"}
      </button>
      {message && <p className="text-[11px] text-[var(--color-ash-veil)]">{message}</p>}
    </div>
  );
}

export function PayoutForm({
  availableKobo,
  destinations,
  canWithdraw,
}: {
  availableKobo: number;
  destinations: Destination[];
  canWithdraw: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<
    { kind: "ok" | "error"; text: string } | null
  >(null);

  if (!canWithdraw) {
    return (
      <p className="text-[12px] leading-relaxed text-[var(--color-ash-veil)]">
        Finish Bachs onboarding and add a usable NGN bank account to withdraw.
      </p>
    );
  }

  return (
    <form
      action={(formData) => {
        setFeedback(null);
        startTransition(async () => {
          const result = await requestSellerPayoutAction(formData);
          if (result.ok) {
            setFeedback({ kind: "ok", text: result.message ?? "Withdrawal sent." });
            router.refresh();
          } else {
            setFeedback({ kind: "error", text: result.error });
          }
        });
      }}
      className="flex flex-col gap-3"
    >
      <div>
        <label
          htmlFor="payout-amount"
          className="block text-[12px] font-semibold text-[var(--color-ink-black)]"
        >
          Amount (NGN)
        </label>
        <input
          id="payout-amount"
          name="amount"
          inputMode="decimal"
          required
          placeholder="0"
          className="mt-1 h-11 w-full rounded-full bg-[var(--color-pure-white)] px-4 text-base text-[var(--color-ink-black)] outline-none ring-1 ring-[var(--color-faint-border)] transition-shadow duration-150 focus:ring-2 focus:ring-[var(--color-shop-violet)] md:text-sm"
        />
        <p className="mt-1 text-[11px] text-[var(--color-ash-veil)]">
          Available {formatKobo(availableKobo)}. Bachs charges ₦50 per withdrawal.
        </p>
      </div>

      {destinations.length > 1 && (
        <div>
          <label
            htmlFor="payout-destination"
            className="block text-[12px] font-semibold text-[var(--color-ink-black)]"
          >
            Bank account
          </label>
          <select
            id="payout-destination"
            name="destination_id"
            className="mt-1 h-11 w-full cursor-pointer rounded-full bg-[var(--color-pure-white)] px-4 text-sm text-[var(--color-ink-black)] outline-none ring-1 ring-[var(--color-faint-border)] focus:ring-2 focus:ring-[var(--color-shop-violet)]"
          >
            {destinations.map((destination) => (
              <option key={destination.id} value={destination.id}>
                {destination.bank_name ?? "Bank"} ·{" "}
                {destination.account_number_last4
                  ? `••••${destination.account_number_last4}`
                  : (destination.account_name ?? "Account")}
              </option>
            ))}
          </select>
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full bg-[var(--color-ink-black)] px-5 text-sm font-semibold text-[var(--color-pure-white)] transition-colors duration-200 hover:bg-[var(--color-shop-violet)] disabled:cursor-wait disabled:opacity-60"
      >
        {isPending ? "Sending…" : "Withdraw to bank"}
      </button>

      {feedback && (
        <p
          role="status"
          className={
            feedback.kind === "ok"
              ? "text-[12px] leading-relaxed text-[var(--color-success)]"
              : "text-[12px] leading-relaxed text-[var(--color-error)]"
          }
        >
          {feedback.text}
        </p>
      )}
    </form>
  );
}

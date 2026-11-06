"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  confirmHandoverAction,
  markOrderReadyAction,
} from "@/features/orders/actions";

export function SellerOrderActions({
  orderId,
  canReady,
  canHandover,
}: {
  orderId: string;
  canReady: boolean;
  canHandover: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<
    { kind: "ok" | "error"; text: string } | null
  >(null);

  const ready = () => {
    if (isPending) return;
    setFeedback(null);
    startTransition(async () => {
      const result = await markOrderReadyAction(orderId);
      if (result.ok) {
        setFeedback({ kind: "ok", text: result.message ?? "Order updated." });
        router.refresh();
      } else {
        setFeedback({ kind: "error", text: result.error });
      }
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {canReady && (
        <button
          type="button"
          onClick={ready}
          disabled={isPending}
          className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full bg-[var(--color-shop-violet)] px-5 text-sm font-semibold text-[var(--color-pure-white)] transition-colors duration-200 hover:bg-[var(--color-primary-hover)] disabled:cursor-wait disabled:opacity-60"
        >
          {isPending ? "Working…" : "Mark ready for handover"}
        </button>
      )}

      {canHandover && (
        <form
          action={(formData) => {
            setFeedback(null);
            startTransition(async () => {
              const result = await confirmHandoverAction(orderId, formData);
              if (result.ok) {
                setFeedback({ kind: "ok", text: result.message ?? "Handover confirmed." });
                router.refresh();
              } else {
                setFeedback({ kind: "error", text: result.error });
              }
            });
          }}
          className="flex flex-col gap-2"
        >
          <label
            htmlFor="pickup-code"
            className="text-[12px] font-semibold text-[var(--color-ink-black)]"
          >
            Buyer&apos;s six-digit pickup code
          </label>
          <input
            id="pickup-code"
            name="pickup_code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            placeholder="000000"
            className="h-12 w-full rounded-full bg-[var(--color-pure-white)] px-4 text-center font-mono text-lg tracking-[0.3em] text-[var(--color-ink-black)] outline-none ring-1 ring-[var(--color-faint-border)] transition-shadow duration-150 focus:ring-2 focus:ring-[var(--color-shop-violet)]"
          />
          <p className="text-[11px] leading-relaxed text-[var(--color-ash-veil)]">
            Only confirm after you have handed over the item and checked the code.
            Five wrong attempts locks confirmation.
          </p>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full bg-[var(--color-ink-black)] px-5 text-sm font-semibold text-[var(--color-pure-white)] transition-colors duration-200 hover:bg-[var(--color-shop-violet)] disabled:cursor-wait disabled:opacity-60"
          >
            {isPending ? "Confirming…" : "Confirm handover"}
          </button>
        </form>
      )}

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
    </div>
  );
}

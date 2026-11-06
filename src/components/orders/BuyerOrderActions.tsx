"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  buyerConfirmReceiptAction,
  raiseOrderIssueAction,
} from "@/features/orders/actions";

export function BuyerOrderActions({
  orderId,
  canConfirm,
  canReport,
}: {
  orderId: string;
  canConfirm: boolean;
  canReport: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showIssue, setShowIssue] = useState(false);
  const [feedback, setFeedback] = useState<
    { kind: "ok" | "error"; text: string } | null
  >(null);

  const confirm = () => {
    if (isPending) return;
    setFeedback(null);
    startTransition(async () => {
      const result = await buyerConfirmReceiptAction(orderId);
      if (result.ok) {
        setFeedback({ kind: "ok", text: result.message ?? "Receipt confirmed." });
        router.refresh();
      } else {
        setFeedback({ kind: "error", text: result.error });
      }
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {canConfirm && (
        <button
          type="button"
          onClick={confirm}
          disabled={isPending}
          className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full bg-[var(--color-shop-violet)] px-5 text-sm font-semibold text-[var(--color-pure-white)] transition-colors duration-200 hover:bg-[var(--color-primary-hover)] disabled:cursor-wait disabled:opacity-60"
        >
          {isPending ? "Working…" : "I've collected the item"}
        </button>
      )}
      {canReport && (
        <button
          type="button"
          onClick={() => setShowIssue((value) => !value)}
          className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full bg-[var(--color-canvas-mist)] px-5 text-sm font-semibold text-[var(--color-ink-black)] transition-colors duration-200 hover:bg-[var(--color-primary-tint)]"
        >
          {showIssue ? "Close" : "Something is wrong"}
        </button>
      )}

      {showIssue && (
        <form
          action={(formData) => {
            setFeedback(null);
            startTransition(async () => {
              const result = await raiseOrderIssueAction(orderId, formData);
              if (result.ok) {
                setFeedback({ kind: "ok", text: result.message ?? "Order paused." });
                setShowIssue(false);
                router.refresh();
              } else {
                setFeedback({ kind: "error", text: result.error });
              }
            });
          }}
          className="flex flex-col gap-2 rounded-[16px] bg-[var(--color-canvas-mist)] p-4"
        >
          <label
            htmlFor="order-issue-reason"
            className="text-[12px] font-semibold text-[var(--color-ink-black)]"
          >
            What went wrong?
          </label>
          <textarea
            id="order-issue-reason"
            name="reason"
            required
            minLength={10}
            maxLength={1000}
            rows={3}
            placeholder="Describe what happened with the item or handover."
            className="w-full rounded-[12px] bg-[var(--color-pure-white)] px-3 py-2 text-sm text-[var(--color-ink-black)] outline-none ring-1 ring-[var(--color-faint-border)] transition-shadow duration-150 focus:ring-2 focus:ring-[var(--color-shop-violet)]"
          />
          <p className="text-[11px] leading-relaxed text-[var(--color-ash-veil)]">
            This pauses the seller payout while Pantaker reviews it.
          </p>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full bg-[var(--color-ink-black)] px-5 text-sm font-semibold text-[var(--color-pure-white)] transition-colors duration-200 hover:bg-[var(--color-shop-violet)] disabled:cursor-wait disabled:opacity-60"
          >
            {isPending ? "Sending…" : "Pause payout and report"}
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

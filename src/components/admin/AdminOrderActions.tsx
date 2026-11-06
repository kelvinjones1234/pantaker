"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  adminForceReleaseAction,
  adminRefundOrderAction,
  adminResolveOrderIssueAction,
} from "@/features/orders/admin-actions";

export function AdminOrderActions({
  orderId,
  canRefund,
  canResolve,
  canForceRelease,
}: {
  orderId: string;
  canRefund: boolean;
  canResolve: boolean;
  canForceRelease: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showRefund, setShowRefund] = useState(false);
  const [feedback, setFeedback] = useState<
    { kind: "ok" | "error"; text: string } | null
  >(null);

  const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) => {
    setFeedback(null);
    startTransition(async () => {
      const result = await fn();
      if (result.ok) {
        setFeedback({ kind: "ok", text: result.message ?? "Done." });
        setShowRefund(false);
        router.refresh();
      } else {
        setFeedback({ kind: "error", text: result.error ?? "That failed." });
      }
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {canResolve && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              run(async () => {
                const data = new FormData();
                data.set("resolution", "resume");
                return adminResolveOrderIssueAction(orderId, data);
              })
            }
            className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full bg-[var(--color-canvas-mist)] px-4 text-xs font-semibold text-[var(--color-ink-black)] transition-colors duration-200 hover:bg-[var(--color-primary-tint)] disabled:opacity-60"
          >
            Resume order
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => run(() => adminForceReleaseAction(orderId))}
            className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full bg-[var(--color-ink-black)] px-4 text-xs font-semibold text-[var(--color-pure-white)] transition-colors duration-200 hover:bg-[var(--color-shop-violet)] disabled:opacity-60"
          >
            Release to seller
          </button>
        </div>
      )}

      {canForceRelease && !canResolve && (
        <button
          type="button"
          disabled={isPending}
          onClick={() => run(() => adminForceReleaseAction(orderId))}
          className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full bg-[var(--color-ink-black)] px-4 text-xs font-semibold text-[var(--color-pure-white)] transition-colors duration-200 hover:bg-[var(--color-shop-violet)] disabled:opacity-60"
        >
          Release to seller now
        </button>
      )}

      {canRefund &&
        (showRefund ? (
          <form
            action={(formData) => run(() => adminRefundOrderAction(orderId, formData))}
            className="flex flex-col gap-2 rounded-[16px] bg-[var(--color-canvas-mist)] p-4"
          >
            <label
              htmlFor="refund-reason"
              className="text-[12px] font-semibold text-[var(--color-ink-black)]"
            >
              Refund reason
            </label>
            <input
              id="refund-reason"
              name="reason"
              required
              minLength={5}
              maxLength={300}
              placeholder="Why is this being refunded?"
              className="h-11 w-full rounded-full bg-[var(--color-pure-white)] px-4 text-sm text-[var(--color-ink-black)] outline-none ring-1 ring-[var(--color-faint-border)] focus:ring-2 focus:ring-[var(--color-shop-violet)]"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full bg-[var(--color-error)] px-4 text-xs font-semibold text-[var(--color-pure-white)] transition-opacity duration-200 hover:opacity-90 disabled:opacity-60"
              >
                {isPending ? "Refunding…" : "Refund buyer in full"}
              </button>
              <button
                type="button"
                onClick={() => setShowRefund(false)}
                className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full bg-[var(--color-pure-white)] px-4 text-xs font-semibold text-[var(--color-ink-black)]"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setShowRefund(true)}
            className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full bg-[var(--color-error-bg)] px-4 text-xs font-semibold text-[var(--color-error)] transition-colors duration-200 hover:bg-[var(--color-error)] hover:text-[var(--color-pure-white)]"
          >
            Refund buyer
          </button>
        ))}

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

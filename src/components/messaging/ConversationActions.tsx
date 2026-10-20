"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  blockUserAction,
  reportConversationAction,
  unblockUserAction,
} from "@/features/messaging/actions";
import { REPORT_REASONS } from "@/lib/validation/messaging";

/**
 * Abuse controls for a conversation: block / unblock the other participant, and
 * report them. Both are validated and scoped on the server; the client only
 * supplies a reason and note.
 */
export function ConversationActions({
  conversationId,
  otherName,
  blockedByMe,
  isLive,
}: {
  conversationId: string;
  otherName: string;
  blockedByMe: boolean;
  isLive: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmingBlock, setConfirmingBlock] = useState(false);
  const [reason, setReason] = useState<string>(REPORT_REASONS[0]);
  const [details, setDetails] = useState("");

  const run = (
    action: (formData: FormData) => Promise<{ ok: boolean; error?: string; notice?: string; errors?: Record<string, string[] | undefined> }>,
    fields: Record<string, string>,
    closeOnSuccess?: () => void,
  ) => {
    if (isPending) return;
    setError(null);
    setNotice(null);
    if (!isLive) {
      setNotice("Preview only — nothing was saved.");
      return;
    }
    const formData = new FormData();
    formData.set("inquiry_id", conversationId);
    for (const [key, value] of Object.entries(fields)) formData.set(key, value);

    startTransition(async () => {
      const res = await action(formData);
      if (!res.ok) {
        setError(res.errors?.details?.[0] ?? res.errors?.reason?.[0] ?? res.error ?? "Something went wrong.");
        return;
      }
      setNotice(res.notice ?? "Done.");
      closeOnSuccess?.();
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        {blockedByMe ? (
          <button
            type="button"
            disabled={isPending}
            onClick={() => run(unblockUserAction, {})}
            className="inline-flex h-10 w-full cursor-pointer items-center justify-center rounded-full border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] px-5 text-[13px] font-semibold text-[var(--color-ink-black)] transition-colors duration-150 hover:border-[var(--color-ink-30)] disabled:cursor-wait disabled:opacity-60"
          >
            Unblock {otherName}
          </button>
        ) : confirmingBlock ? (
          <div className="flex flex-col gap-2">
            <p className="text-[12px] text-[var(--color-ash-veil)]">
              Block {otherName}? They won&apos;t be able to message you.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() => run(blockUserAction, {}, () => setConfirmingBlock(false))}
                className="inline-flex h-10 flex-1 cursor-pointer items-center justify-center rounded-full border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] px-4 text-[13px] font-semibold text-[var(--color-error)] transition-colors duration-150 hover:border-[var(--color-error)] disabled:opacity-60"
              >
                Yes, block
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => setConfirmingBlock(false)}
                className="inline-flex h-10 flex-1 cursor-pointer items-center justify-center rounded-full border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] px-4 text-[13px] font-semibold text-[var(--color-ink-black)] transition-colors duration-150 hover:border-[var(--color-ink-30)] disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingBlock(true)}
            className="inline-flex h-10 w-full cursor-pointer items-center justify-center rounded-full border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] px-5 text-[13px] font-semibold text-[var(--color-ink-black)] transition-colors duration-150 hover:border-[var(--color-ink-30)]"
          >
            Block {otherName}
          </button>
        )}
      </div>

      <details className="group">
        <summary className="flex cursor-pointer list-none items-center text-[12px] font-semibold text-[var(--color-muted-gray)] transition-colors duration-150 hover:text-[var(--color-ink-black)] [&::-webkit-details-marker]:hidden">
          Report this conversation
        </summary>
        <div className="mt-3 flex flex-col gap-3">
          <label htmlFor={`report-reason-${conversationId}`} className="sr-only">
            Reason
          </label>
          <select
            id={`report-reason-${conversationId}`}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="h-11 w-full cursor-pointer rounded-full border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] px-4 text-[13px] text-[var(--color-ink-black)] outline-none transition-colors duration-150 hover:border-[var(--color-ink-30)] focus:border-[var(--color-shop-violet)]"
          >
            {REPORT_REASONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <label htmlFor={`report-details-${conversationId}`} className="sr-only">
            What happened
          </label>
          <textarea
            id={`report-details-${conversationId}`}
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="What happened?"
            className="resize-y rounded-[20px] border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] px-4 py-3 text-[13px] text-[var(--color-ink-black)] outline-none transition-colors duration-150 placeholder:text-[var(--color-muted-gray)] hover:border-[var(--color-ink-30)] focus:border-[var(--color-shop-violet)]"
          />
          <button
            type="button"
            disabled={isPending}
            onClick={() => run(reportConversationAction, { reason, details })}
            className="inline-flex h-10 w-full cursor-pointer items-center justify-center rounded-full bg-[var(--color-ink-black)] px-5 text-[13px] font-semibold text-[var(--color-pure-white)] transition-opacity duration-200 hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
          >
            Submit report
          </button>
        </div>
      </details>

      {error && (
        <p role="alert" className="text-[12px] text-[var(--color-error)]">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-[12px] text-[var(--color-ash-veil)]">
          {notice}
        </p>
      )}
    </div>
  );
}

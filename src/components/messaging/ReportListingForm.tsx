"use client";

import { useState, useTransition } from "react";
import { reportListingAction } from "@/features/listings/actions";
import { REPORT_REASONS } from "@/lib/validation/messaging";

/** Report a listing. Reason and details are validated on the server. */
export function ReportListingForm({ listingId, isLive }: { listingId: string; isLive: boolean }) {
  const [reason, setReason] = useState<string>(REPORT_REASONS[0]);
  const [details, setDetails] = useState("");
  const [isPending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isPending) return;
    setError(null);
    setNotice(null);

    if (!isLive) {
      setNotice("Preview only — nothing was submitted.");
      return;
    }

    startTransition(async () => {
      const res = await reportListingAction(listingId, reason, details.trim());
      if (!res.ok) {
        setError(res.error ?? "We couldn't submit your report.");
        return;
      }
      setDetails("");
      setNotice("Thanks — our team will review this report.");
    });
  };

  return (
    <details className="group">
      <summary className="flex cursor-pointer list-none items-center text-[12px] font-semibold text-[var(--color-muted-gray)] transition-colors duration-150 hover:text-[var(--color-ink-black)] [&::-webkit-details-marker]:hidden">
        Report this listing
      </summary>
      <form onSubmit={onSubmit} noValidate className="mt-3 flex flex-col gap-3">
        <label htmlFor="listing-report-reason" className="sr-only">
          Reason
        </label>
        <select
          id="listing-report-reason"
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
        <label htmlFor="listing-report-details" className="sr-only">
          What is wrong
        </label>
        <textarea
          id="listing-report-details"
          value={details}
          onChange={(event) => setDetails(event.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="What's wrong with this listing?"
          className="resize-y rounded-[20px] border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] px-4 py-3 text-[13px] text-[var(--color-ink-black)] outline-none transition-colors duration-150 placeholder:text-[var(--color-muted-gray)] hover:border-[var(--color-ink-30)] focus:border-[var(--color-shop-violet)]"
        />
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
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-10 w-full cursor-pointer items-center justify-center rounded-full bg-[var(--color-ink-black)] px-5 text-[13px] font-semibold text-[var(--color-pure-white)] transition-opacity duration-200 hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
        >
          {isPending ? "Submitting…" : "Submit report"}
        </button>
      </form>
    </details>
  );
}

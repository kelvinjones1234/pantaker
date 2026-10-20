"use client";

import { useId, useState, useTransition } from "react";
import { AlertIcon } from "@/components/brand/icons";
import { DELETE_CONFIRMATION_PHRASE } from "@/lib/validation/settings";
import { requestAccountDeletionAction } from "@/features/settings/actions";

/**
 * Destructive account deletion. Guarded by a typed confirmation phrase and a
 * server-side re-check; the action also re-derives the account from the session.
 */
export function DeleteAccountPanel({
  isLive,
  requestedAt,
}: {
  isLive: boolean;
  requestedAt: string | null;
}) {
  const inputId = useId();
  const [confirm, setConfirm] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const matches = confirm.trim() === DELETE_CONFIRMATION_PHRASE;

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isPending) return;
    setError(null);

    if (!matches) {
      setError(`Type ${DELETE_CONFIRMATION_PHRASE} to confirm.`);
      return;
    }
    if (!isLive) {
      setError("Deletion needs a connected account. Sign in with a live project to delete.");
      return;
    }

    const formData = new FormData();
    formData.set("confirm", confirm);

    startTransition(async () => {
      const res = await requestAccountDeletionAction(formData);
      if (res && !res.ok) {
        setError(res.errors?.confirm?.[0] ?? res.error ?? "Could not process the request.");
      }
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {requestedAt && (
        <p
          role="status"
          className="flex items-start gap-2 rounded-[16px] bg-[var(--color-warning-bg)] px-4 py-3 text-[12px] leading-relaxed text-[var(--color-warning)]"
        >
          <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
          A deletion request was recorded on {requestedAt}. Your account hasn&apos;t been removed
          yet — sign back in and confirm below to repeat it.
        </p>
      )}

      <div className="rounded-[20px] bg-[var(--color-error-bg)] p-4">
        <p className="text-[13px] font-semibold text-[var(--color-error)]">
          Deleting is permanent and can&apos;t be undone.
        </p>
        <p className="mt-1 text-[12px] leading-relaxed text-[var(--color-ink-black)]">
          Your listings, photos, and enquiries are removed and your account is closed. Export or
          archive anything you want to keep first.
        </p>
      </div>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
        <div>
          <label htmlFor={inputId} className="mb-1.5 block text-xs font-semibold text-[var(--color-ink-black)]">
            Type {DELETE_CONFIRMATION_PHRASE} to confirm
          </label>
          <input
            id={inputId}
            type="text"
            name="confirm"
            autoComplete="off"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            aria-invalid={Boolean(error)}
            placeholder={DELETE_CONFIRMATION_PHRASE}
            className="h-[52px] w-full rounded-full border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] px-4 text-sm text-[var(--color-ink-black)] outline-none transition-colors duration-150 placeholder:text-[var(--color-muted-gray)] hover:border-[var(--color-ink-30)] focus:border-[var(--color-shop-violet)] aria-[invalid=true]:border-[var(--color-error)]"
          />
        </div>

        {error && (
          <p role="alert" className="text-[12px] text-[var(--color-error)]">
            {error}
          </p>
        )}

        <div>
          <button
            type="submit"
            disabled={isPending || !matches}
            className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full bg-[var(--color-error)] px-5 text-sm font-semibold text-[var(--color-pure-white)] transition-colors duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "Processing…" : "Delete my account"}
          </button>
        </div>
      </form>
    </div>
  );
}

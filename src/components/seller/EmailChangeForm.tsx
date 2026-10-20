"use client";

import { useId, useState, useTransition } from "react";
import { changeEmailAction } from "@/features/settings/actions";
import { CheckIcon } from "@/components/brand/icons";

const inputClass =
  "h-[52px] w-full rounded-full border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] px-4 text-sm text-[var(--color-ink-black)] outline-none transition-colors duration-150 placeholder:text-[var(--color-muted-gray)] hover:border-[var(--color-ink-30)] focus:border-[var(--color-shop-violet)] aria-[invalid=true]:border-[var(--color-error)]";

/**
 * Email change through the app's own account system. No password field, no
 * parallel credential store. The change only takes effect once the confirmation
 * link Pantaker emails to the new address is followed.
 */
export function EmailChangeForm({
  currentEmail,
  isLive,
}: {
  currentEmail: string;
  isLive: boolean;
}) {
  const inputId = useId();
  const [value, setValue] = useState(currentEmail);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const unchanged =
    value.trim().toLowerCase() === currentEmail.trim().toLowerCase();

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isPending) return;
    setError(null);
    setNotice(null);

    if (!isLive) {
      setNotice("Preview only — nothing was changed.");
      return;
    }

    const formData = new FormData();
    formData.set("email", value);

    startTransition(async () => {
      const res = await changeEmailAction(formData);
      if (!res.ok) {
        setError(
          res.errors?.email?.[0] ?? res.error ?? "Could not update your email.",
        );
        return;
      }
      setNotice(res.message ?? "Check your inbox to confirm the change.");
    });
  };

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
      <div>
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-xs font-semibold text-[var(--color-ink-black)]"
        >
          Email address
        </label>
        <input
          id={inputId}
          type="email"
          name="email"
          autoComplete="email"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          aria-invalid={Boolean(error)}
          className={inputClass}
        />
      </div>

      {error && (
        <p role="alert" className="text-[12px] text-[var(--color-error)]">
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="flex items-start gap-2 rounded-[16px] bg-[var(--color-primary-tint)] px-4 py-3 text-[12px] leading-relaxed text-[var(--color-ink-black)]"
        >
          <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-shop-violet)]" />
          {notice}
        </p>
      )}

      <div>
        <button
          type="submit"
          disabled={isPending || unchanged}
          className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full bg-[var(--color-shop-violet)] px-5 text-sm font-semibold text-[var(--color-pure-white)] transition-colors duration-200 hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Updating…" : "Change email"}
        </button>
      </div>
    </form>
  );
}

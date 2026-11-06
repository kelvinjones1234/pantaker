import type { ReactNode, SelectHTMLAttributes } from "react";
import { CaretDownIcon } from "@/components/brand/icons";
import { cn } from "@/lib/utils";

/**
 * Shared form field primitives for Pantaker forms. Presentational only — no
 * validation or permission logic lives here; callers pass already-computed
 * errors. Matches the pill-input shape used across Pantaker forms.
 */

export const fieldLabelClass = "mb-1.5 block text-xs font-semibold text-[var(--color-ink-black)]";

export const fieldInputClass =
  "h-11 w-full rounded-full border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] px-4 text-base text-[var(--color-ink-black)] outline-none transition-colors duration-150 placeholder:text-[var(--color-muted-gray)] hover:border-[var(--color-ink-30)] focus:border-[var(--color-shop-violet)] aria-[invalid=true]:border-[var(--color-error)] sm:text-sm";

export const fieldSelectClass =
  "h-11 w-full cursor-pointer appearance-none rounded-full border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] pl-4 pr-10 text-base text-[var(--color-ink-black)] outline-none transition-colors duration-150 hover:border-[var(--color-ink-30)] focus:border-[var(--color-shop-violet)] aria-[invalid=true]:border-[var(--color-error)] sm:text-sm";

export const fieldTextareaClass =
  "w-full rounded-[20px] border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] p-4 text-base text-[var(--color-ink-black)] outline-none transition-colors duration-150 placeholder:text-[var(--color-muted-gray)] hover:border-[var(--color-ink-30)] focus:border-[var(--color-shop-violet)] aria-[invalid=true]:border-[var(--color-error)] sm:text-sm";

export function FieldSelect({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select {...props} className={cn(fieldSelectClass, className)}>
        {children}
      </select>
      <CaretDownIcon className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-gray)]" />
    </div>
  );
}

/** First validation message for a field, announced via role="alert". */
export function FieldError({ messages, id }: { messages?: string[]; id?: string }) {
  if (!messages?.length) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-xs text-[var(--color-error)]">
      {messages[0]}
    </p>
  );
}

/** Label + control + error, wired together with aria-describedby. */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string[];
  hint?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const errorId = error?.length ? `${htmlFor}-error` : undefined;
  return (
    <div className={cn("flex flex-col", className)}>
      <label htmlFor={htmlFor} className={fieldLabelClass}>
        {label}
        {required && <span className="text-[var(--color-shop-violet)]"> *</span>}
      </label>
      {hint && <p className="mb-1.5 text-[11px] text-[var(--color-muted-gray)]">{hint}</p>}
      {children}
      <FieldError id={errorId} messages={error} />
    </div>
  );
}

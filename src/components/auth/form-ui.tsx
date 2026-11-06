import { AlertIcon } from "@/components/auth/icons";

export const authInputClass =
  "h-[52px] w-full max-w-[352px] sm:w-[352px] rounded-full border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] px-4 text-base text-[var(--color-ink-black)] outline-none transition-colors duration-200 placeholder:text-[var(--color-muted-gray)] focus:border-[var(--color-muted-gray)] sm:text-sm";

export const authButtonClass =
  "inline-flex h-[52px] w-full max-w-[352px] sm:w-[352px] cursor-pointer items-center justify-center rounded-full bg-[var(--color-shop-violet)] px-5 text-sm font-semibold text-[var(--color-pure-white)] transition-colors duration-200 hover:bg-[var(--color-primary-hover)] disabled:cursor-wait disabled:opacity-60";

export function FieldError({ id, messages }: { id: string; messages?: string[] }) {
  if (!messages?.length) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-xs text-[var(--color-error)]">
      {messages[0]}
    </p>
  );
}

export function FormAlert({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-start gap-2 rounded-2xl bg-[var(--color-error-bg)] px-4 py-3 text-xs text-[var(--color-error)]">
      <AlertIcon className="mt-px h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

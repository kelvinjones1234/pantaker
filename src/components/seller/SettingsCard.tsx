import type { ReactNode } from "react";

/**
 * A clearly separated settings group. Each group is its own card, so a page
 * never becomes one long undifferentiated form.
 */
export function SettingsCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <section className="shop-card p-5 sm:p-7">
      <h2 className="font-brand-serif text-lg font-bold tracking-tight text-[var(--color-ink-black)]">
        {title}
      </h2>
      {description && (
        <p className="mt-1 max-w-xl text-[12px] leading-relaxed text-[var(--color-muted-gray)]">
          {description}
        </p>
      )}
      {children && <div className="mt-5">{children}</div>}
    </section>
  );
}

/** A compact label/value row used inside informational settings cards. */
export function SettingsRow({
  label,
  value,
  note,
  trailing,
}: {
  label: string;
  value?: string;
  note?: string;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 py-3 [&+&]:border-t [&+&]:border-[var(--color-faint-border)] sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-[var(--color-ink-black)]">{label}</p>
        {note && <p className="mt-0.5 text-[12px] leading-relaxed text-[var(--color-muted-gray)]">{note}</p>}
      </div>
      {value !== undefined && (
        <p
          className="min-w-0 text-[13px] leading-relaxed text-[var(--color-ink-black)] [overflow-wrap:anywhere] sm:max-w-[55%] sm:shrink-0 sm:truncate sm:leading-normal"
          title={value}
        >
          {value}
        </p>
      )}
      {trailing}
    </div>
  );
}

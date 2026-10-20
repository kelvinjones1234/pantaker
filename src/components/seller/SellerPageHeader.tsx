import type { ReactNode } from "react";

/** Consistent page heading for every Seller Centre page. */
export function SellerPageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="font-brand-serif text-2xl font-bold tracking-tight text-[var(--color-ink-black)] sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-[var(--color-ash-veil)]">
            {description}
          </p>
        )}
      </div>
      {children && <div className="flex shrink-0 flex-wrap gap-2">{children}</div>}
    </div>
  );
}

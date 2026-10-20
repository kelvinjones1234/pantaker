import type { ReactNode } from "react";

/** Shared empty state for seller surfaces (listings, results, first run). */
export function SellerEmptyState({
  icon,
  heading,
  copy,
  children,
}: {
  icon?: ReactNode;
  heading: string;
  copy: string;
  children?: ReactNode;
}) {
  return (
    <div className="shop-card flex flex-col items-center px-6 py-14 text-center">
      {icon && (
        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-primary-tint)]">
          {icon}
        </span>
      )}
      <h2 className="font-brand-serif text-xl font-bold tracking-tight text-[var(--color-ink-black)]">
        {heading}
      </h2>
      <p className="mt-2 max-w-md text-[13px] leading-relaxed text-[var(--color-muted-gray)]">{copy}</p>
      {children && <div className="mt-6 flex flex-wrap justify-center gap-3">{children}</div>}
    </div>
  );
}

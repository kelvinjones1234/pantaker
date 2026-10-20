import type { ReactNode } from "react";
import { AlertIcon } from "@/components/brand/icons";
import { cn } from "@/lib/utils";

/**
 * Presentational error state used inside route error boundaries and inline
 * result areas. The retry control is supplied by the caller (a client boundary),
 * so this stays a plain component.
 */
export function ErrorState({
  title = "Something went wrong",
  description,
  className,
  children,
}: {
  title?: string;
  description?: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cn("shop-card flex flex-col items-center px-6 py-14 text-center", className)}>
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-error-bg)]">
        <AlertIcon className="h-7 w-7 text-[var(--color-error)]" />
      </span>
      <h2 className="font-brand-serif text-xl font-bold tracking-tight text-[var(--color-ink-black)]">
        {title}
      </h2>
      {description && (
        <p className="mt-2 max-w-md text-[13px] leading-relaxed text-[var(--color-muted-gray)]">
          {description}
        </p>
      )}
      {children && <div className="mt-6 flex flex-wrap justify-center gap-3">{children}</div>}
    </div>
  );
}

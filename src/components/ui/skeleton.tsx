import { cn } from "@/lib/utils";

/** Flat placeholder bar. Cards carry no elevation, so skeletons stay subtle. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("block animate-pulse rounded-full bg-[var(--color-canvas-mist)]", className)}
    />
  );
}

/** Announces a page-shaped skeleton once while keeping the shapes decorative. */
export function LoadingRegion({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className={className}
    >
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

/**
 * Table-shaped loading placeholder. Announces busy state once, then renders the
 * row/column skeleton; on small screens it falls back to stacked card blocks,
 * matching the responsive data table.
 */
export function SkeletonTable({
  rows = 6,
  columns = 4,
  label = "Loading results",
}: {
  rows?: number;
  columns?: number;
  label?: string;
}) {
  return (
    <div className="shop-card overflow-hidden" role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">{label}</span>

      <div className="hidden md:block">
        <div className="flex gap-4 border-b border-[var(--color-faint-border)] p-4">
          {Array.from({ length: columns }).map((_, column) => (
            <Skeleton key={column} className="h-3 flex-1" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, row) => (
          <div
            key={row}
            className="flex gap-4 border-b border-[var(--color-faint-border)] p-4 last:border-b-0"
          >
            {Array.from({ length: columns }).map((_, column) => (
              <Skeleton
                key={column}
                className={cn("h-4 flex-1", column === 0 && "max-w-[220px]")}
              />
            ))}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 p-4 md:hidden">
        {Array.from({ length: Math.min(rows, 4) }).map((_, row) => (
          <Skeleton key={row} className="h-16 w-full rounded-[20px]" />
        ))}
      </div>
    </div>
  );
}

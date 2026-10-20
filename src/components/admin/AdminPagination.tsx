import Link from "next/link";
import { ChevronRightIcon } from "@/components/brand/icons";
import { cn } from "@/lib/utils";
import { pageRange, pageWindow } from "@/lib/pagination";

/**
 * Server-rendered, link-based pagination for admin directories. Links keep the
 * current filters in the URL (via `hrefForPage`) and need no JavaScript. The
 * current page is marked with `aria-current`; the ends are disabled spans rather
 * than dead links.
 */
export function AdminPagination({
  page,
  pageSize,
  totalItems,
  hrefForPage,
  itemLabel = "items",
}: {
  page: number;
  pageSize: number;
  totalItems: number;
  hrefForPage: (page: number) => string;
  itemLabel?: string;
}) {
  const { from, to, total, totalPages, page: current } = pageRange(page, pageSize, totalItems);

  if (total === 0) return null;

  const base =
    "flex h-9 min-w-9 items-center justify-center rounded-full border px-3 text-[13px] font-medium transition-colors duration-150";
  const idle =
    "border-[var(--color-faint-border)] bg-[var(--color-pure-white)] text-[var(--color-ink-black)] hover:border-[var(--color-ink-30)]";

  return (
    <nav
      aria-label="Pagination"
      className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-between"
    >
      <p className="text-[12px] text-[var(--color-ash-veil)]" aria-live="polite">
        Showing{" "}
        <span className="tabular font-semibold text-[var(--color-ink-black)]">
          {from}–{to}
        </span>{" "}
        of <span className="tabular font-semibold text-[var(--color-ink-black)]">{total}</span>{" "}
        {itemLabel}
      </p>

      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {current > 1 ? (
            <Link
              href={hrefForPage(current - 1)}
              rel="prev"
              aria-label="Previous page"
              className={cn(base, idle)}
            >
              <ChevronRightIcon className="h-4 w-4 rotate-180" />
            </Link>
          ) : (
            <span
              aria-disabled="true"
              aria-label="Previous page"
              className={cn(base, idle, "cursor-not-allowed opacity-40")}
            >
              <ChevronRightIcon className="h-4 w-4 rotate-180" />
            </span>
          )}

          {pageWindow(current, totalPages).map((entry, index) =>
            entry === "gap" ? (
              <span
                key={`gap-${index}`}
                aria-hidden="true"
                className="px-1 text-[13px] text-[var(--color-muted-gray)]"
              >
                …
              </span>
            ) : (
              <Link
                key={entry}
                href={hrefForPage(entry)}
                aria-label={`Page ${entry}`}
                aria-current={entry === current ? "page" : undefined}
                className={cn(
                  base,
                  entry === current
                    ? "border-[var(--color-ink-black)] bg-[var(--color-ink-black)] text-[var(--color-pure-white)]"
                    : idle,
                )}
              >
                {entry}
              </Link>
            ),
          )}

          {current < totalPages ? (
            <Link
              href={hrefForPage(current + 1)}
              rel="next"
              aria-label="Next page"
              className={cn(base, idle)}
            >
              <ChevronRightIcon className="h-4 w-4" />
            </Link>
          ) : (
            <span
              aria-disabled="true"
              aria-label="Next page"
              className={cn(base, idle, "cursor-not-allowed opacity-40")}
            >
              <ChevronRightIcon className="h-4 w-4" />
            </span>
          )}
        </div>
      )}
    </nav>
  );
}

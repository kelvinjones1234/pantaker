import { ChevronRightIcon } from "@/components/brand/icons";
import { pageWindow } from "@/lib/pagination";

export function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const base =
    "flex h-9 min-w-9 cursor-pointer items-center justify-center rounded-full border px-3 text-[13px] font-medium transition-colors duration-150";

  return (
    <nav aria-label="Pagination" className="mt-8 flex flex-wrap items-center justify-center gap-1.5">
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
        className={`${base} border-[var(--color-faint-border)] bg-[var(--color-pure-white)] text-[var(--color-ink-black)] hover:border-[var(--color-ink-30)] disabled:cursor-not-allowed disabled:opacity-40`}
      >
        <ChevronRightIcon className="h-4 w-4 rotate-180" />
      </button>

      {pageWindow(page, totalPages).map((entry, index) =>
        entry === "gap" ? (
          <span key={`gap-${index}`} className="px-1 text-[13px] text-[var(--color-muted-gray)]">
            …
          </span>
        ) : (
          <button
            key={entry}
            type="button"
            onClick={() => onChange(entry)}
            aria-current={entry === page ? "page" : undefined}
            className={`${base} ${
              entry === page
                ? "border-[var(--color-ink-black)] bg-[var(--color-ink-black)] text-[var(--color-pure-white)]"
                : "border-[var(--color-faint-border)] bg-[var(--color-pure-white)] text-[var(--color-ink-black)] hover:border-[var(--color-ink-30)]"
            }`}
          >
            {entry}
          </button>
        ),
      )}

      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Next page"
        className={`${base} border-[var(--color-faint-border)] bg-[var(--color-pure-white)] text-[var(--color-ink-black)] hover:border-[var(--color-ink-30)] disabled:cursor-not-allowed disabled:opacity-40`}
      >
        <ChevronRightIcon className="h-4 w-4" />
      </button>
    </nav>
  );
}

import { ChevronRightIcon } from "@/components/brand/icons";

function pageWindow(page: number, totalPages: number): Array<number | "gap"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages: Array<number | "gap"> = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);
  if (start > 2) pages.push("gap");
  for (let i = start; i <= end; i += 1) pages.push(i);
  if (end < totalPages - 1) pages.push("gap");
  pages.push(totalPages);
  return pages;
}

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

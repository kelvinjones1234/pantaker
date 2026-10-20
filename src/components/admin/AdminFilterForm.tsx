import Link from "next/link";
import { SearchIcon } from "@/components/brand/icons";
import { fieldSelectClass } from "@/components/ui/form-field";

/**
 * Server-rendered GET filter bar for an admin directory. It works without
 * JavaScript (a real form submit), keeps controls keyboard-native, and resets to
 * page 1 on submit because the page param is deliberately not carried. Every
 * control has an explicit label.
 */
export interface AdminFilterOption {
  value: string;
  label: string;
}

export interface AdminFilterSelect {
  name: string;
  label: string;
  value: string;
  options: AdminFilterOption[];
}

export function AdminFilterForm({
  action,
  q = "",
  searchLabel = "Search",
  searchPlaceholder,
  filters = [],
  resetHref,
}: {
  action: string;
  q?: string;
  searchLabel?: string;
  searchPlaceholder?: string;
  filters?: AdminFilterSelect[];
  /** Where the "Reset" link goes (the bare directory path). */
  resetHref: string;
}) {
  return (
    <form
      action={action}
      method="get"
      className="shop-card flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-end"
    >
      <div className="flex min-w-[220px] flex-1 flex-col gap-1.5">
        <label htmlFor="admin-search" className="text-xs font-semibold text-[var(--color-ink-black)]">
          {searchLabel}
        </label>
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-gray)]" />
          <input
            id="admin-search"
            name="q"
            type="search"
            defaultValue={q}
            placeholder={searchPlaceholder}
            autoComplete="off"
            className="h-11 w-full rounded-full border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] pl-11 pr-4 text-sm text-[var(--color-ink-black)] outline-none transition-colors duration-150 placeholder:text-[var(--color-muted-gray)] hover:border-[var(--color-ink-30)] focus:border-[var(--color-shop-violet)]"
          />
        </div>
      </div>

      {filters.map((filter) => (
        <div key={filter.name} className="flex flex-col gap-1.5">
          <label
            htmlFor={`admin-filter-${filter.name}`}
            className="text-xs font-semibold text-[var(--color-ink-black)]"
          >
            {filter.label}
          </label>
          <select
            id={`admin-filter-${filter.name}`}
            name={filter.name}
            defaultValue={filter.value}
            className={fieldSelectClass}
          >
            {filter.options.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ))}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full bg-[var(--color-shop-violet)] px-5 text-sm font-semibold text-[var(--color-pure-white)] transition-colors duration-150 hover:bg-[var(--color-primary-hover)]"
        >
          Apply
        </button>
        <Link
          href={resetHref}
          className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] px-5 text-sm font-semibold text-[var(--color-ink-black)] transition-colors duration-150 hover:border-[var(--color-ink-30)]"
        >
          Reset
        </Link>
      </div>
    </form>
  );
}

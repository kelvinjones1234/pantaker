"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CaretDownIcon, GridIcon, ListIcon, XIcon } from "@/components/brand/icons";
import {
  CategoryRail,
  CategorySidebar,
  type NavCategory,
} from "@/components/marketplace/CategoryNav";
import { EmptyState } from "@/components/marketplace/EmptyState";
import { FilterChips } from "@/components/marketplace/FilterChips";
import { ListingGrid } from "@/components/marketplace/ListingGrid";
import { Pagination } from "@/components/marketplace/Pagination";
import {
  buildSearchParams,
  EMPTY_BROWSE,
  hasActiveFilters,
  type BrowsePricing,
  type BrowseState,
  type BrowseView,
} from "@/components/marketplace/browse-state";
import type { CardListing } from "@/components/marketplace/ListingCard";
import { ABUJA_AREAS, ALL_ABUJA } from "@/lib/areas";
import type { SampleGroup } from "@/lib/sample-data";

const CONDITION_OPTIONS = [
  { value: "", label: "All" },
  { value: "working", label: "Working" },
  { value: "used", label: "Used" },
  { value: "partially_usable", label: "Partly usable" },
  { value: "for_parts", label: "For parts" },
  { value: "scrap", label: "Scrap" },
  { value: "damaged", label: "Damaged" },
];

type PriceChip = "any" | "free" | "under100k" | "100k-500k" | "over500k";

const PRICE_OPTIONS: Array<{ value: PriceChip; label: string }> = [
  { value: "any", label: "Any price" },
  { value: "free", label: "Free" },
  { value: "under100k", label: "Under ₦100k" },
  { value: "100k-500k", label: "₦100k–₦500k" },
  { value: "over500k", label: "₦500k+" },
];

function priceChipValue(state: BrowseState): PriceChip {
  if (state.pricing === "free") return "free";
  if (state.minPrice == null && state.maxPrice == null) return "any";
  if (state.minPrice == null && state.maxPrice === 100000) return "under100k";
  if (state.minPrice === 100000 && state.maxPrice === 500000) return "100k-500k";
  if (state.minPrice === 500000 && state.maxPrice == null) return "over500k";
  return "any";
}

function priceChipPatch(value: PriceChip): Partial<BrowseState> {
  switch (value) {
    case "free":
      return { pricing: "free", minPrice: null, maxPrice: null };
    case "under100k":
      return { pricing: "", minPrice: null, maxPrice: 100000 };
    case "100k-500k":
      return { pricing: "", minPrice: 100000, maxPrice: 500000 };
    case "over500k":
      return { pricing: "", minPrice: 500000, maxPrice: null };
    default:
      return { pricing: "", minPrice: null, maxPrice: null };
  }
}

const CONDITION_LABEL_MAP: Record<string, string> = Object.fromEntries(
  CONDITION_OPTIONS.map((option) => [option.value, option.label]),
);

export interface ListingsBrowserProps {
  items: CardListing[];
  total: number;
  pageSize: number;
  isLive: boolean;
  categories: NavCategory[];
  activeSlug: string;
  groups: SampleGroup[];
  state: BrowseState;
  heading: string;
  description: string;
}

export function ListingsBrowser({
  items,
  total,
  pageSize,
  isLive,
  categories,
  activeSlug,
  groups,
  state: initialState,
  heading,
  description,
}: ListingsBrowserProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const [state, setState] = useState<BrowseState>(initialState);
  const [queryInput, setQueryInput] = useState(initialState.q);

  const stateRef = useRef(state);
  stateRef.current = state;
  const pushedKey = useRef(buildSearchParams(initialState));
  const stateKey = buildSearchParams(initialState);

  useEffect(() => {
    if (stateKey === pushedKey.current) return;
    pushedKey.current = stateKey;
    setState(initialState);
    setQueryInput(initialState.q);
  }, [stateKey, initialState]);

  const apply = (partial: Partial<BrowseState>) => {
    const next: BrowseState = { ...stateRef.current, ...partial };
    if (!("page" in partial)) next.page = 1;
    setState(next);
    const key = buildSearchParams(next);
    pushedKey.current = key;
    startTransition(() => {
      router.push(key ? `${pathname}?${key}` : pathname, { scroll: false });
    });
  };

  const applyRef = useRef(apply);
  applyRef.current = apply;

  useEffect(() => {
    if (queryInput === stateRef.current.q) return;
    const timer = setTimeout(() => applyRef.current({ q: queryInput }), 350);
    return () => clearTimeout(timer);
  }, [queryInput]);

  const resetAll = () => {
    setQueryInput("");
    setState(EMPTY_BROWSE);
    pushedKey.current = "";
    startTransition(() => {
      router.push(pathname, { scroll: false });
    });
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const activePrice = priceChipValue(state);
  const filtering = hasActiveFilters(state);

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6 sm:py-8">
      <div className="lg:flex lg:gap-8">
        <aside className="hidden lg:block lg:w-56 lg:shrink-0">
          <div className="sticky top-24">
            <CategorySidebar
              categories={categories}
              activeSlug={activeSlug}
              groups={groups}
              activeGroup={state.group}
              onSelectGroup={(slug) => apply({ group: slug })}
            />
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mb-5 lg:hidden">
            <CategoryRail categories={categories} activeSlug={activeSlug} />
          </div>

          <header className="mb-5">
            <h1 className="font-brand-serif text-2xl font-semibold tracking-tight text-[var(--color-ink-black)] sm:text-3xl">
              {heading}
            </h1>
            <p className="mt-1 max-w-2xl text-[13px] text-[var(--color-muted-gray)]">{description}</p>
            <p className="mt-2 text-xs text-[var(--color-muted-gray)]" aria-live="polite">
              {total} {total === 1 ? "item" : "items"}
              {isLive ? " in Abuja" : " in this preview"}
            </p>
          </header>

          <div className="shop-card mb-5 flex flex-col gap-4 p-4">
            <FilterChips
              label="Condition"
              options={CONDITION_OPTIONS}
              value={state.condition}
              onChange={(condition) => apply({ condition })}
            />
            <FilterChips
              label="Price"
              options={PRICE_OPTIONS}
              value={activePrice}
              onChange={(value) => apply(priceChipPatch(value as PriceChip))}
            />

            <div className="flex flex-wrap items-center gap-2 border-t border-[var(--color-faint-border)] pt-4">
              <label className="sr-only" htmlFor="filter-area">
                District
              </label>
              <div className="relative">
                <select
                  id="filter-area"
                  value={state.area}
                  onChange={(event) => apply({ area: event.target.value })}
                  className="cursor-pointer appearance-none rounded-full border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] py-1.5 pl-3.5 pr-9 text-xs font-medium text-[var(--color-ink-black)] outline-none transition-colors duration-150 hover:border-[var(--color-ink-30)] focus:border-[var(--color-muted-gray)]"
                >
                  {ABUJA_AREAS.map((area) => (
                    <option key={area.name} value={area.name}>
                      {area.name === ALL_ABUJA ? "All Abuja" : area.name}
                    </option>
                  ))}
                </select>
                <CaretDownIcon className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-muted-gray)]" />
              </div>

              <label className="sr-only" htmlFor="filter-sort">
                Sort listings
              </label>
              <div className="relative">
                <select
                  id="filter-sort"
                  value={state.sort}
                  onChange={(event) => apply({ sort: event.target.value as BrowseState["sort"] })}
                  className="cursor-pointer appearance-none rounded-full border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] py-1.5 pl-3.5 pr-9 text-xs font-medium text-[var(--color-ink-black)] outline-none transition-colors duration-150 hover:border-[var(--color-ink-30)] focus:border-[var(--color-muted-gray)]"
                >
                  <option value="newest">Sort: Newest</option>
                  <option value="price_asc">Price: Low to high</option>
                  <option value="price_desc">Price: High to low</option>
                </select>
                <CaretDownIcon className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-muted-gray)]" />
              </div>

              <div className="ml-auto flex items-center gap-1 rounded-full border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] p-1">
                {(["grid", "list"] as BrowseView[]).map((view) => (
                  <button
                    key={view}
                    type="button"
                    onClick={() => apply({ view })}
                    aria-pressed={state.view === view}
                    aria-label={view === "grid" ? "Grid view" : "List view"}
                    className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-full transition-colors duration-150 ${
                      state.view === view
                        ? "bg-[var(--color-ink-black)] text-[var(--color-pure-white)]"
                        : "text-[var(--color-muted-gray)] hover:text-[var(--color-ink-black)]"
                    }`}
                  >
                    {view === "grid" ? <GridIcon className="h-4 w-4" /> : <ListIcon className="h-4 w-4" />}
                  </button>
                ))}
              </div>
            </div>

            {filtering && (
              <div className="flex flex-wrap items-center gap-2 border-t border-[var(--color-faint-border)] pt-4">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted-gray)]">
                  Active
                </span>
                {state.q && <ActiveChip label={`“${state.q}”`} onClear={() => { setQueryInput(""); apply({ q: "" }); }} />}
                {state.group && (
                  <ActiveChip
                    label={groups.find((g) => g.slug === state.group)?.name ?? state.group}
                    onClear={() => apply({ group: "" })}
                  />
                )}
                {state.condition && (
                  <ActiveChip
                    label={CONDITION_LABEL_MAP[state.condition] ?? state.condition}
                    onClear={() => apply({ condition: "" })}
                  />
                )}
                {activePrice !== "any" && (
                  <ActiveChip
                    label={PRICE_OPTIONS.find((p) => p.value === activePrice)?.label ?? "Price"}
                    onClear={() => apply(priceChipPatch("any"))}
                  />
                )}
                {state.area !== ALL_ABUJA && (
                  <ActiveChip label={state.area} onClear={() => apply({ area: ALL_ABUJA })} />
                )}
                <button
                  type="button"
                  onClick={resetAll}
                  className="cursor-pointer rounded-full px-2.5 py-1 text-[11px] font-semibold text-[var(--color-shop-violet)] transition-colors duration-150 hover:bg-[var(--color-primary-tint)]"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>

          {items.length === 0 && !isPending ? (
            <EmptyState onReset={resetAll} />
          ) : (
            <ListingGrid items={items} view={state.view} pending={isPending} />
          )}

          <Pagination page={state.page} totalPages={totalPages} onChange={(page) => apply({ page })} />
        </div>
      </div>
    </div>
  );
}

function ActiveChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] py-1 pl-3 pr-1.5 text-[11px] font-medium text-[var(--color-ink-black)]">
      {label}
      <button
        type="button"
        onClick={onClear}
        aria-label={`Remove filter ${label}`}
        className="flex h-4 w-4 cursor-pointer items-center justify-center rounded-full text-[var(--color-muted-gray)] transition-colors duration-150 hover:bg-[var(--color-canvas-mist)] hover:text-[var(--color-ink-black)]"
      >
        <XIcon className="h-3 w-3" />
      </button>
    </span>
  );
}

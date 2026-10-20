"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Pagination } from "@/components/marketplace/Pagination";
import { SellerEmptyState } from "@/components/seller/SellerEmptyState";
import { SellerStatusPill } from "@/components/seller/SellerStatusPill";
import { CaretDownIcon, MoreIcon, PackageIcon, PlusIcon, SearchIcon } from "@/components/brand/icons";
import { deleteListingAction, updateListingStatusAction } from "@/features/listings/actions";
import { canDelete, canEdit, transitionsFrom } from "@/features/listings/lifecycle";
import { SELLER_STATUS_FILTERS } from "@/lib/listing-status";
import { pricingLabel, timeAgo } from "@/lib/utils";
import type { ItemStatus } from "@/types/marketplace";

export interface SellerListingView {
  id: string;
  title: string;
  category: string | null;
  pricing_type: string;
  price: number | null;
  status: ItemStatus;
  created_at: string;
  updated_at: string;
  image?: string;
  /** Set only when the listing is publicly visible. */
  publicHref?: string;
}

export interface SellerListingsFilters {
  q: string;
  status: string;
  category: string;
  sort: string;
}

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "updated", label: "Recently updated" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "title_asc", label: "Title: A–Z" },
];

const inputClass =
  "h-11 w-full rounded-full border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] px-4 text-sm text-[var(--color-ink-black)] outline-none transition-colors duration-150 placeholder:text-[var(--color-muted-gray)] hover:border-[var(--color-ink-30)] focus:border-[var(--color-shop-violet)]";

const selectClass =
  "h-11 w-full cursor-pointer appearance-none rounded-full border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] pl-4 pr-10 text-sm text-[var(--color-ink-black)] outline-none transition-colors duration-150 hover:border-[var(--color-ink-30)] focus:border-[var(--color-shop-violet)]";

function SelectShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      {children}
      <CaretDownIcon className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-gray)]" />
    </div>
  );
}

export function SellerListingsBrowser({
  items,
  total,
  page,
  pageSize,
  filters,
  categories,
}: {
  items: SellerListingView[];
  total: number;
  page: number;
  pageSize: number;
  filters: SellerListingsFilters;
  categories: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [openId, setOpenId] = useState<string | null>(null);
  const [search, setSearch] = useState(filters.q);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasFilters = Boolean(filters.q || filters.status || filters.category || filters.sort !== "newest");
  const isFirstRun = total === 0 && !hasFilters;

  const baseQuery = useMemo(() => new URLSearchParams(params.toString()), [params]);

  const navigate = (patch: Record<string, string | null>, resetPage = false) => {
    const next = new URLSearchParams(baseQuery.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (resetPage) next.delete("page");
    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  const runAction = (
    fn: () => Promise<{ ok: true } | { ok: false; error: string }>,
    onError: (message: string) => void,
  ) => {
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        onError(res.error || "Something went wrong.");
        return;
      }
      router.refresh();
    });
  };

  const changeStatus = (id: string, to: ItemStatus) => {
    setOpenId(null);
    runAction(() => updateListingStatusAction(id, to), (message) => window.alert(message || "Could not update status."));
  };

  const removeListing = (id: string) => {
    setOpenId(null);
    if (!window.confirm("Delete this listing? This cannot be undone.")) return;
    runAction(() => deleteListingAction(id), (message) => window.alert(message || "Could not delete listing."));
  };

  if (isFirstRun) {
    return (
      <SellerEmptyState
        icon={<PackageIcon className="h-7 w-7 text-[var(--color-shop-violet)]" />}
        heading="You haven't listed anything yet"
        copy="Once you post an item it will appear here with its status and management actions."
      >
        <Link
          href="/sell"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[var(--color-shop-violet)] px-5 text-sm font-semibold text-[var(--color-pure-white)] transition-colors duration-200 hover:bg-[var(--color-primary-hover)]"
        >
          <PlusIcon className="h-4 w-4" />
          List your first item
        </Link>
      </SellerEmptyState>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Toolbar */}
      <div className="shop-card flex flex-col gap-3 p-4">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            navigate({ q: search.trim() || null }, true);
          }}
          className="flex items-center gap-2"
          role="search"
        >
          <div className="relative flex-1">
            <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-gray)]" />
            <input
              type="search"
              name="q"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search your listings by title"
              aria-label="Search your listings by title"
              className={`${inputClass} pl-11`}
            />
          </div>
          <button
            type="submit"
            className="inline-flex h-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[var(--color-ink-black)] px-5 text-sm font-semibold text-[var(--color-pure-white)] transition-opacity duration-150 hover:opacity-90"
          >
            Search
          </button>
        </form>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          <SelectShell>
            <select
              aria-label="Filter by status"
              value={filters.status}
              onChange={(event) => navigate({ status: event.target.value || null }, true)}
              className={selectClass}
            >
              {SELLER_STATUS_FILTERS.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </SelectShell>

          <SelectShell>
            <select
              aria-label="Filter by category"
              value={filters.category}
              onChange={(event) => navigate({ category: event.target.value || null }, true)}
              className={selectClass}
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </SelectShell>

          <SelectShell>
            <select
              aria-label="Sort listings"
              value={filters.sort}
              onChange={(event) => navigate({ sort: event.target.value }, true)}
              className={selectClass}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </SelectShell>

          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                router.push(pathname);
              }}
              className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] px-4 text-sm font-semibold text-[var(--color-ink-black)] transition-colors duration-150 hover:border-[var(--color-ink-30)]"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <SellerEmptyState
          heading="No listings match"
          copy="Nothing matches the current search or filters. Try a different term, or clear the filters to see everything."
        >
          <button
            type="button"
            onClick={() => {
              setSearch("");
              router.push(pathname);
            }}
            className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] px-5 text-sm font-semibold text-[var(--color-ink-black)] transition-colors duration-150 hover:border-[var(--color-ink-30)]"
          >
            Clear filters
          </button>
        </SellerEmptyState>
      ) : (
        <ul className="flex flex-col gap-2.5" aria-busy={isPending}>
          {items.map((listing) => {
            const transitions = transitionsFrom(listing.status);
            const deletable = canDelete(listing.status);
            const editable = canEdit(listing.status);
            const menuOpen = openId === listing.id;

            return (
              <li key={listing.id} className="shop-card p-3 sm:p-4">
                <div className="flex items-start gap-3 sm:items-center">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[16px] bg-[var(--color-canvas-mist)] sm:h-20 sm:w-20">
                    {listing.image ? (
                      <Image src={listing.image} alt="" fill sizes="80px" className="object-cover" />
                    ) : (
                      <span className="flex h-full items-center justify-center text-[10px] text-[var(--color-muted-gray)]">
                        No photo
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <SellerStatusPill status={listing.status} />
                      {listing.category && (
                        <span className="text-[12px] text-[var(--color-muted-gray)]">{listing.category}</span>
                      )}
                    </div>
                    <p className="mt-1 truncate text-[14px] font-semibold text-[var(--color-ink-black)]">
                      {listing.title}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-[var(--color-muted-gray)]">
                      <span className="font-sans tabular font-semibold text-[var(--color-ink-black)]">
                        {pricingLabel(listing.pricing_type, listing.price)}
                      </span>
                      <span>Listed {timeAgo(listing.created_at)}</span>
                      <span className="hidden sm:inline">Updated {timeAgo(listing.updated_at)}</span>
                    </div>
                  </div>

                  <div className="relative shrink-0">
                    <button
                      type="button"
                      aria-label={`Manage ${listing.title}`}
                      aria-expanded={menuOpen}
                      onClick={() => setOpenId(menuOpen ? null : listing.id)}
                      className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] text-[var(--color-ink-black)] transition-colors duration-150 hover:border-[var(--color-ink-30)]"
                    >
                      <MoreIcon className="h-4 w-4" />
                    </button>

                    {menuOpen && (
                      <div
                        role="menu"
                        className="absolute right-0 z-20 mt-1 w-56 rounded-[20px] bg-[var(--color-pure-white)] p-1.5 shadow-[var(--shadow-lg)]"
                      >
                        {editable && (
                          <Link
                            role="menuitem"
                            href={`/seller/listings/${listing.id}/edit`}
                            onClick={() => setOpenId(null)}
                            className="block rounded-[14px] px-3 py-2 text-[13px] font-medium text-[var(--color-ink-black)] transition-colors duration-150 hover:bg-[var(--color-canvas-mist)]"
                          >
                            Edit listing
                          </Link>
                        )}
                        {listing.publicHref && (
                          <Link
                            role="menuitem"
                            href={listing.publicHref}
                            onClick={() => setOpenId(null)}
                            className="block rounded-[14px] px-3 py-2 text-[13px] font-medium text-[var(--color-ink-black)] transition-colors duration-150 hover:bg-[var(--color-canvas-mist)]"
                          >
                            View in marketplace
                          </Link>
                        )}
                        {transitions.map((transition) => (
                          <button
                            key={transition.to}
                            role="menuitem"
                            type="button"
                            onClick={() => changeStatus(listing.id, transition.to)}
                            className="block w-full cursor-pointer rounded-[14px] px-3 py-2 text-left text-[13px] font-medium text-[var(--color-ink-black)] transition-colors duration-150 hover:bg-[var(--color-canvas-mist)]"
                          >
                            {transition.label}
                          </button>
                        ))}
                        {deletable && (
                          <button
                            role="menuitem"
                            type="button"
                            onClick={() => removeListing(listing.id)}
                            className="block w-full cursor-pointer rounded-[14px] px-3 py-2 text-left text-[13px] font-medium text-[var(--color-error)] transition-colors duration-150 hover:bg-[var(--color-error-bg)]"
                          >
                            Delete listing
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {total > 0 && (
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-[12px] text-[var(--color-ash-veil)]">
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total} listings
          </p>
          <Pagination
            page={page}
            totalPages={totalPages}
            onChange={(nextPage) => navigate({ page: String(nextPage) })}
          />
        </div>
      )}
    </div>
  );
}

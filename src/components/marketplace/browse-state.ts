import { ALL_ABUJA } from "@/lib/areas";

export type BrowseSort = "newest" | "price_asc" | "price_desc";
export type BrowseView = "grid" | "list";
export type BrowsePricing = "" | "fixed" | "negotiable" | "free" | "offer";

export interface BrowseState {
  q: string;
  group: string;
  condition: string;
  pricing: BrowsePricing;
  area: string;
  minPrice: number | null;
  maxPrice: number | null;
  sort: BrowseSort;
  view: BrowseView;
  page: number;
}

export const EMPTY_BROWSE: BrowseState = {
  q: "",
  group: "",
  condition: "",
  pricing: "",
  area: ALL_ABUJA,
  minPrice: null,
  maxPrice: null,
  sort: "newest",
  view: "grid",
  page: 1,
};

/** Serialize browse state into a query string (defaults omitted for clean URLs). */
export function buildSearchParams(state: BrowseState): string {
  const params = new URLSearchParams();
  if (state.q.trim()) params.set("q", state.q.trim());
  if (state.group) params.set("group", state.group);
  if (state.condition) params.set("condition", state.condition);
  if (state.pricing) params.set("pricing", state.pricing);
  if (state.area && state.area !== ALL_ABUJA) params.set("area", state.area);
  if (state.minPrice != null) params.set("minPrice", String(state.minPrice));
  if (state.maxPrice != null) params.set("maxPrice", String(state.maxPrice));
  if (state.sort !== "newest") params.set("sort", state.sort);
  if (state.view !== "grid") params.set("view", state.view);
  if (state.page > 1) params.set("page", String(state.page));
  return params.toString();
}

function toNumber(value: string | null): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function stateFromParams(params: {
  q?: string;
  group?: string;
  condition?: string;
  pricing?: string;
  area?: string;
  minPrice?: string | number | null;
  maxPrice?: string | number | null;
  sort?: string;
  view?: string;
  page?: string | number | null;
}): BrowseState {
  const sort = params.sort;
  const view = params.view;
  const pricing = params.pricing;
  return {
    q: params.q ?? "",
    group: params.group ?? "",
    condition: params.condition ?? "",
    pricing: (["fixed", "negotiable", "free", "offer"].includes(pricing ?? "")
      ? pricing
      : "") as BrowsePricing,
    area: params.area || ALL_ABUJA,
    minPrice: toNumber(params.minPrice == null ? null : String(params.minPrice)),
    maxPrice: toNumber(params.maxPrice == null ? null : String(params.maxPrice)),
    sort: sort === "price_asc" || sort === "price_desc" ? sort : "newest",
    view: view === "list" ? "list" : "grid",
    page: Math.max(1, Number(params.page) || 1),
  };
}

export function hasActiveFilters(state: BrowseState): boolean {
  return Boolean(
    state.q ||
      state.group ||
      state.condition ||
      state.pricing ||
      (state.area && state.area !== ALL_ABUJA) ||
      state.minPrice != null ||
      state.maxPrice != null,
  );
}

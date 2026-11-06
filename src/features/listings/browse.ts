import { getCategories, sampleProductGroups, searchListings } from "@/features/listings/queries";
import { stateFromParams, type BrowseState } from "@/components/marketplace/browse-state";
import type { NavCategory } from "@/components/marketplace/CategoryNav";
import type { CardListing } from "@/components/marketplace/ListingCard";
import { paginationDefaults } from "@/config/site";
import { ALL_ABUJA } from "@/lib/areas";
import { getSavedArea } from "@/features/location/preference";

export type RawSearchParams = Record<string, string | string[] | undefined>;

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export interface BrowseData {
  state: BrowseState;
  items: CardListing[];
  total: number;
  pageSize: number;
  live: boolean;
  categories: NavCategory[];
  activeSlug: string;
  groups: ReturnType<typeof sampleProductGroups>;
  heading: string;
  description: string;
  isCategory: boolean;
}

/**
 * Shared loader for every listings surface. Pass `categorySlug` to scope to a
 * category/product group, or "" for the browse-all page.
 */
export async function loadBrowse(
  categorySlug: string,
  raw: RawSearchParams,
): Promise<BrowseData> {
  const savedArea = await getSavedArea();
  const state = stateFromParams(
    {
      q: one(raw.q),
      group: one(raw.group),
      condition: one(raw.condition),
      pricing: one(raw.pricing),
      area: one(raw.area),
      minPrice: one(raw.minPrice),
      maxPrice: one(raw.maxPrice),
      sort: one(raw.sort),
      view: one(raw.view),
      page: one(raw.page),
    },
    savedArea,
  );

  const [{ items, total, live }, rawCategories] = await Promise.all([
    searchListings({
      q: state.q,
      category: categorySlug,
      group: state.group,
      condition: state.condition,
      pricing: state.pricing || undefined,
      city: "",
      area: state.area === ALL_ABUJA ? "" : state.area,
      minPrice: state.minPrice ?? undefined,
      maxPrice: state.maxPrice ?? undefined,
      sort: state.sort,
      page: state.page,
    }),
    getCategories(),
  ]);

  const categories: NavCategory[] = rawCategories.map((category) => ({
    name: category.name,
    slug: category.slug,
    description:
      ("description" in category && typeof category.description === "string"
        ? category.description
        : "") ||
      (typeof category.count === "string" ? category.count : ""),
  }));

  const active = categorySlug
    ? categories.find((category) => category.slug === categorySlug.toLowerCase())
    : undefined;

  const groups = !live && categorySlug ? sampleProductGroups(categorySlug) : [];

  return {
    state,
    items,
    total,
    pageSize: paginationDefaults.marketplacePageSize,
    live,
    categories,
    activeSlug: active ? active.slug : "",
    groups,
    heading: active ? active.name : "All recoverable items",
    description: active
      ? active.description ||
        (state.area === ALL_ABUJA
          ? `Recoverable ${active.name.toLowerCase()} from around Abuja.`
          : `Recoverable ${active.name.toLowerCase()} in ${state.area}, Abuja.`)
      : state.area === ALL_ABUJA
        ? "Browse scrap, spares, and reusable goods posted by people and businesses around Abuja."
        : `Browse scrap, spares, and reusable goods posted by people and businesses in ${state.area}, Abuja.`,
    isCategory: Boolean(active),
  };
}

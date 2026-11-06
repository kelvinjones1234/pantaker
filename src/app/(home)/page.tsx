import { ShopLandingPage } from "@/components/marketplace/ShopLandingPage";
import {
  getAreaCounts,
  getCategories,
  getCategoryCounts,
  searchListings,
} from "@/features/listings/queries";
import { getAuthUser } from "@/features/auth/queries";
import { getSavedArea } from "@/features/location/preference";
import { ALL_ABUJA, resolveArea } from "@/lib/areas";

type SearchParams = Record<string, string | string[] | undefined>;

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const raw = await searchParams;
  const savedArea = await getSavedArea();
  const area = resolveArea(one(raw.area), savedArea);

  const [{ items, live }, rawCategories, user, areaCounts, categoryCounts] =
    await Promise.all([
      searchListings({
        q: "",
        category: "",
        group: "",
        condition: "",
        city: "",
        area: area === ALL_ABUJA ? "" : area,
        sort: "newest",
        page: 1,
      }),
      getCategories(),
      getAuthUser().catch(() => null),
      getAreaCounts(),
      getCategoryCounts(area),
    ]);

  const categories = rawCategories.map((c) => ({ name: c.name, slug: c.slug }));

  return (
    <ShopLandingPage
      initialItems={items}
      categories={categories}
      isLive={live}
      user={user ? { id: user.id, email: user.email } : null}
      initialArea={area}
      areaCounts={areaCounts}
      categoryCounts={categoryCounts}
    />
  );
}

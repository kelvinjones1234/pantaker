import { ShopLandingPage } from "@/components/marketplace/ShopLandingPage";
import { searchListings, getCategories } from "@/features/listings/queries";

export default async function HomePage() {
  const [{ items, live }, rawCategories] = await Promise.all([
    searchListings({ q: "", category: "", condition: "", city: "", sort: "newest", page: 1 }),
    getCategories(),
  ]);

  const categories = rawCategories.map((c) => ({ name: c.name, slug: c.slug }));

  return (
    <ShopLandingPage
      initialItems={items}
      categories={categories}
      isLive={live}
    />
  );
}

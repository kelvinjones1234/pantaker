import { ShopLandingPage } from "@/components/marketplace/ShopLandingPage";
import { searchListings, getCategories } from "@/features/listings/queries";
import { getAuthUser } from "@/features/auth/queries";

export default async function HomePage() {
  const [{ items, live }, rawCategories, user] = await Promise.all([
    searchListings({
      q: "",
      category: "",
      group: "",
      condition: "",
      city: "",
      area: "",
      sort: "newest",
      page: 1,
    }),
    getCategories(),
    getAuthUser().catch(() => null),
  ]);

  const categories = rawCategories.map((c) => ({ name: c.name, slug: c.slug }));

  return (
    <ShopLandingPage
      initialItems={items}
      categories={categories}
      isLive={live}
      user={user ? { id: user.id, email: user.email } : null}
    />
  );
}

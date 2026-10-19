import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ListingsBrowser } from "@/components/marketplace/ListingsBrowser";
import { loadBrowse, type RawSearchParams } from "@/features/listings/browse";

interface CategoryPageProps {
  params: Promise<{ category: string }>;
  searchParams: Promise<RawSearchParams>;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { category } = await params;
  const data = await loadBrowse(category, {});
  if (!data.isCategory) return { title: "Category not found" };
  return {
    title: `${data.heading} — recoverable items in Abuja`,
    description: data.description,
  };
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const [{ category }, raw] = await Promise.all([params, searchParams]);
  const data = await loadBrowse(category, raw);

  if (!data.isCategory) notFound();

  return (
    <ListingsBrowser
      items={data.items}
      total={data.total}
      pageSize={data.pageSize}
      isLive={data.live}
      categories={data.categories}
      activeSlug={data.activeSlug}
      groups={data.groups}
      state={data.state}
      heading={data.heading}
      description={data.description}
    />
  );
}

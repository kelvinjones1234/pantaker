import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPermission } from "@/features/admin/authorization";
import {
  buildCategoryTree,
  flattenCategoryTree,
  getDescendantIds,
} from "@/features/admin/category-rules";
import {
  fetchAdminCategories,
  fetchCategoryListingCounts,
} from "@/features/admin/category-queries";
import { SellerPageHeader } from "@/components/seller/SellerPageHeader";
import { SettingsCard } from "@/components/seller/SettingsCard";
import { CategoryForm } from "@/components/admin/CategoryForm";
import { CategoryStatusActions } from "@/components/admin/CategoryStatusActions";

export const metadata: Metadata = {
  title: "Edit category — Pantaker Admin",
  robots: { index: false, follow: false },
};

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAdminPermission("listings.review", `/admin/categories/${id}`);

  const [categories, counts] = await Promise.all([
    fetchAdminCategories(),
    fetchCategoryListingCounts(),
  ]);
  const category = categories.find((item) => item.id === id);
  if (!category) notFound();

  const forbidden = new Set([id, ...getDescendantIds(categories, id)]);
  const parentOptions = flattenCategoryTree(buildCategoryTree(categories))
    .filter(({ category: item }) => !forbidden.has(item.id))
    .map(({ category: item, depth }) => ({ id: item.id, name: item.name, depth }));

  const listingCount = counts.get(id) ?? 0;
  const childCount = categories.filter((item) => item.parent_id === id).length;

  return (
    <div className="flex flex-col gap-6">
      <SellerPageHeader
        title={category.name}
        description="Edit the category details, move it in the hierarchy, or archive it from public browsing."
      >
        <Link
          href="/admin/categories"
          className="inline-flex h-10 items-center justify-center rounded-full border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] px-4 text-[13px] font-semibold text-[var(--color-ink-black)] transition-colors duration-150 hover:border-[var(--color-ink-30)]"
        >
          Back to categories
        </Link>
      </SellerPageHeader>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <CategoryForm mode="edit" category={category} parentOptions={parentOptions} />

        <div className="flex flex-col gap-5">
          <SettingsCard
            title="Status and deletion"
            description="Disabling keeps every listing reference intact while hiding the category from new listings and public navigation."
          >
            <div className="flex flex-col gap-3">
              <p className="text-[13px] text-[var(--color-ink-black)]">
                <span className="font-semibold">{category.is_active ? "Active" : "Disabled"}</span>
                {" · "}
                {listingCount} listing{listingCount === 1 ? "" : "s"} · {childCount} subcategor
                {childCount === 1 ? "y" : "ies"}
              </p>
              <CategoryStatusActions
                id={category.id}
                name={category.name}
                isActive={category.is_active}
                listingCount={listingCount}
                childCount={childCount}
              />
            </div>
          </SettingsCard>

          <SettingsCard title="Identifiers" description="Stable internal references used by listings.">
            <dl className="flex flex-col gap-3 text-[12px]">
              <div>
                <dt className="font-semibold text-[var(--color-ink-black)]">Category id</dt>
                <dd className="mt-0.5 break-all text-[var(--color-muted-gray)]">{category.id}</dd>
              </div>
              <div>
                <dt className="font-semibold text-[var(--color-ink-black)]">Public path</dt>
                <dd className="mt-0.5 break-all text-[var(--color-muted-gray)]">
                  /marketplace/{category.slug}
                </dd>
              </div>
            </dl>
          </SettingsCard>
        </div>
      </div>
    </div>
  );
}

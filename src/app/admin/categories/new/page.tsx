import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminPermission } from "@/features/admin/authorization";
import { buildCategoryTree, flattenCategoryTree } from "@/features/admin/category-rules";
import { fetchAdminCategories } from "@/features/admin/category-queries";
import { SellerPageHeader } from "@/components/seller/SellerPageHeader";
import { CategoryForm } from "@/components/admin/CategoryForm";

export const metadata: Metadata = {
  title: "New category — Pantaker Admin",
  robots: { index: false, follow: false },
};

export default async function NewCategoryPage() {
  await requireAdminPermission("listings.review", "/admin/categories/new");

  const categories = await fetchAdminCategories();
  const parentOptions = flattenCategoryTree(buildCategoryTree(categories)).map(
    ({ category, depth }) => ({ id: category.id, name: category.name, depth }),
  );

  return (
    <div className="flex flex-col gap-6">
      <SellerPageHeader
        title="New category"
        description="Add a category to the marketplace tree. It becomes available to sellers and public browsing as soon as it is created."
      >
        <Link
          href="/admin/categories"
          className="inline-flex h-10 items-center justify-center rounded-full border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] px-4 text-[13px] font-semibold text-[var(--color-ink-black)] transition-colors duration-150 hover:border-[var(--color-ink-30)]"
        >
          Back to categories
        </Link>
      </SellerPageHeader>

      <CategoryForm mode="create" parentOptions={parentOptions} />
    </div>
  );
}

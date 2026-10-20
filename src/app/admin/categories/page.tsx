import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminPermission } from "@/features/admin/authorization";
import {
  buildCategoryTree,
  flattenCategoryTree,
  type AdminCategoryRecord,
} from "@/features/admin/category-rules";
import {
  fetchAdminCategories,
  fetchCategoryListingCounts,
} from "@/features/admin/category-queries";
import { SellerPageHeader } from "@/components/seller/SellerPageHeader";
import { CategoryRowActions } from "@/components/admin/CategoryRowActions";
import { StatusPill } from "@/components/ui/status-pill";

export const metadata: Metadata = {
  title: "Categories — Pantaker Admin",
  robots: { index: false, follow: false },
};

function groupPositions(categories: AdminCategoryRecord[]) {
  const positions = new Map<string, { index: number; size: number }>();
  const groups = new Map<string, AdminCategoryRecord[]>();
  for (const category of categories) {
    const key = category.parent_id ?? "__root__";
    const group = groups.get(key) ?? [];
    group.push(category);
    groups.set(key, group);
  }
  for (const group of groups.values()) {
    group.forEach((category, index) => {
      positions.set(category.id, { index, size: group.length });
    });
  }
  return positions;
}

export default async function AdminCategoriesPage() {
  await requireAdminPermission("listings.review", "/admin/categories");

  const [categories, counts] = await Promise.all([
    fetchAdminCategories(),
    fetchCategoryListingCounts(),
  ]);
  const tree = buildCategoryTree(categories);
  const flat = flattenCategoryTree(tree);
  const positions = groupPositions(categories);
  const activeCount = categories.filter((category) => category.is_active).length;

  return (
    <div className="flex flex-col gap-6">
      <SellerPageHeader
        title="Categories"
        description="Manage the marketplace taxonomy from the database. Changes apply to public browsing and the seller listing form immediately."
      >
        <Link
          href="/admin"
          className="inline-flex h-10 items-center justify-center rounded-full border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] px-4 text-[13px] font-semibold text-[var(--color-ink-black)] transition-colors duration-150 hover:border-[var(--color-ink-30)]"
        >
          Back to admin
        </Link>
        <Link
          href="/admin/categories/new"
          className="inline-flex h-10 items-center justify-center rounded-full bg-[var(--color-shop-violet)] px-4 text-[13px] font-semibold text-[var(--color-pure-white)] transition-colors duration-150 hover:bg-[var(--color-primary-hover)]"
        >
          New category
        </Link>
      </SellerPageHeader>

      <div className="flex flex-wrap items-center gap-2 text-[12px] text-[var(--color-muted-gray)]">
        <span className="rounded-full bg-[var(--color-canvas-mist)] px-3 py-1 font-semibold text-[var(--color-ink-black)]">
          {categories.length} total
        </span>
        <span className="rounded-full bg-[var(--color-canvas-mist)] px-3 py-1 font-semibold text-[var(--color-ink-black)]">
          {activeCount} active
        </span>
        <span className="rounded-full bg-[var(--color-canvas-mist)] px-3 py-1 font-semibold text-[var(--color-ink-black)]">
          {categories.length - activeCount} disabled
        </span>
      </div>

      {flat.length === 0 ? (
        <div className="shop-card p-10 text-center">
          <h2 className="font-brand-serif text-lg font-bold tracking-tight text-[var(--color-ink-black)]">
            No categories yet
          </h2>
          <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-[var(--color-muted-gray)]">
            Create the first category to make it available on the sell form and in marketplace
            browsing.
          </p>
          <Link
            href="/admin/categories/new"
            className="mt-5 inline-flex h-10 items-center justify-center rounded-full bg-[var(--color-shop-violet)] px-4 text-[13px] font-semibold text-[var(--color-pure-white)] transition-colors duration-150 hover:bg-[var(--color-primary-hover)]"
          >
            Create a category
          </Link>
        </div>
      ) : (
        <div className="shop-card overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--color-faint-border)] px-4 py-3 sm:px-5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-muted-gray)]">
              Category hierarchy
            </p>
            <p className="hidden text-[11px] text-[var(--color-muted-gray)] sm:block">
              Subcategories are indented under their parent
            </p>
          </div>

          <ul className="divide-y divide-[var(--color-faint-border)]">
            {flat.map(({ category, depth }) => {
              const position = positions.get(category.id);
              const canMoveUp = Boolean(position && position.index > 0);
              const canMoveDown = Boolean(position && position.index < position.size - 1);
              const listingCount = counts.get(category.id) ?? 0;

              return (
                <li
                  key={category.id}
                  className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5"
                >
                  <div
                    className="min-w-0 flex-1"
                    style={{ marginLeft: `${Math.min(depth, 6) * 20}px` }}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[13px] font-semibold text-[var(--color-ink-black)]">
                        {category.name}
                      </p>
                      <StatusPill tone={category.is_active ? "neutral" : "warning"}>
                        {category.is_active ? "Active" : "Disabled"}
                      </StatusPill>
                      {depth > 0 && (
                        <span className="text-[11px] text-[var(--color-muted-gray)]">
                          Subcategory
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-[12px] text-[var(--color-muted-gray)]">
                      /{category.slug}
                    </p>
                    {category.description && (
                      <p className="mt-1 line-clamp-1 text-[12px] text-[var(--color-muted-gray)]">
                        {category.description}
                      </p>
                    )}
                    <p className="mt-1.5 text-[11px] text-[var(--color-ash-veil)]">
                      {listingCount} listing{listingCount === 1 ? "" : "s"}
                    </p>
                  </div>

                  <div className="shrink-0">
                    <CategoryRowActions
                      id={category.id}
                      name={category.name}
                      isActive={category.is_active}
                      canMoveUp={canMoveUp}
                      canMoveDown={canMoveDown}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

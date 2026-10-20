import type { AdminCategoryRecord } from "@/features/admin/category-rules";
import { getPrisma, isPrismaConfigured } from "@/lib/prisma";
import { withUserContext } from "@/lib/db/context";
import type { User } from "@/generated/prisma/client";

/**
 * Database access for category management. Writes run inside the admin's
 * transaction-local context so the audit trigger records who made the change.
 */

export class CategoryStorageError extends Error {
  readonly code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "CategoryStorageError";
    this.code = code;
  }
}

export interface CategoryWriteInput {
  name: string;
  slug: string;
  description: string | null;
  parent_id: string | null;
  sort_order: number;
}

export interface CategoryUpdatePatch {
  name?: string;
  slug?: string;
  description?: string | null;
  parent_id?: string | null;
  sort_order?: number;
  is_active?: boolean;
}

function storageError(error: unknown, fallback: string): CategoryStorageError {
  if (typeof error === "object" && error !== null && "code" in error) {
    return new CategoryStorageError(fallback, String(error.code));
  }
  return new CategoryStorageError(fallback);
}

export async function fetchAdminCategories(): Promise<AdminCategoryRecord[]> {
  if (!isPrismaConfigured()) return [];

  const rows = await getPrisma().category.findMany({
    orderBy: [{ sort_order: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      parent_id: true,
      icon_key: true,
      sort_order: true,
      is_active: true,
    },
  });
  return rows as AdminCategoryRecord[];
}

/** How many listings — including drafts and sold items — reference each category. */
export async function fetchCategoryListingCounts(): Promise<
  Map<string, number>
> {
  if (!isPrismaConfigured()) return new Map();

  const groups = await getPrisma().listing.groupBy({
    by: ["category_id"],
    where: { category_id: { not: null } },
    _count: { _all: true },
  });

  const counts = new Map<string, number>();
  for (const group of groups) {
    if (group.category_id) counts.set(group.category_id, group._count._all);
  }
  return counts;
}

export async function insertCategory(
  actor: Pick<User, "id" | "admin_role">,
  input: CategoryWriteInput,
): Promise<string> {
  try {
    return await withUserContext(actor, async (tx) => {
      const category = await tx.category.create({
        data: input,
        select: { id: true },
      });
      return category.id;
    });
  } catch (error) {
    throw storageError(error, "Could not create the category.");
  }
}

export async function updateCategory(
  actor: Pick<User, "id" | "admin_role">,
  id: string,
  input: CategoryUpdatePatch,
): Promise<void> {
  try {
    await withUserContext(actor, async (tx) => {
      const result = await tx.category.updateMany({
        where: { id },
        data: input,
      });
      if (result.count === 0) {
        throw new CategoryStorageError("That category no longer exists.");
      }
    });
  } catch (error) {
    if (error instanceof CategoryStorageError) throw error;
    throw storageError(error, "Could not update the category.");
  }
}

export async function updateCategorySortOrder(
  actor: Pick<User, "id" | "admin_role">,
  id: string,
  sortOrder: number,
): Promise<void> {
  try {
    await withUserContext(actor, async (tx) => {
      await tx.category.update({
        where: { id },
        data: { sort_order: sortOrder },
      });
    });
  } catch (error) {
    throw storageError(error, "Could not reorder the categories.");
  }
}

export async function deleteCategoryRow(
  actor: Pick<User, "id" | "admin_role">,
  id: string,
): Promise<void> {
  try {
    await withUserContext(actor, (tx) => tx.category.delete({ where: { id } }));
  } catch (error) {
    throw storageError(error, "Could not delete the category.");
  }
}

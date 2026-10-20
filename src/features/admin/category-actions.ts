"use server";

import { revalidatePath } from "next/cache";
import { requireAdminPermissionForAction } from "@/features/admin/authorization";
import {
  evaluateCategoryDeletion,
  evaluateCategoryDisable,
  findNameConflict,
  findSlugConflict,
  getDescendantIds,
  nextSortOrder,
  planCategoryReorder,
  validateCategoryParent,
} from "@/features/admin/category-rules";
import {
  CategoryStorageError,
  deleteCategoryRow,
  fetchAdminCategories,
  fetchCategoryListingCounts,
  insertCategory,
  updateCategory,
  updateCategorySortOrder,
} from "@/features/admin/category-queries";
import {
  categoryActiveSchema,
  categoryFormSchema,
  categoryIdSchema,
  categoryReorderSchema,
  categoryUpdateSchema,
} from "@/lib/validation/categories";

export type CategoryActionResult =
  | { ok: true; id?: string; message?: string }
  | {
      ok: false;
      error?: string;
      errors?: Record<string, string[] | undefined>;
    };

/** Category taxonomy is part of listing moderation, so it uses that permission. */
const CATEGORY_PERMISSION = "listings.review" as const;

const READ_ERROR = "Could not load the category tree. Please try again.";
const WRITE_ERROR = "Could not save the category. Please try again.";

function failFromStorage(
  error: unknown,
  fallback: string,
): CategoryActionResult {
  if (error instanceof CategoryStorageError) {
    if (error.code === "23505") {
      return {
        ok: false,
        errors: {
          slug: ["This slug is already in use. Choose a different one."],
        },
      };
    }
    if (error.code === "23503") {
      return {
        ok: false,
        error:
          "This category is still referenced by listings or subcategories. Disable it instead, or move those records first.",
      };
    }
    return { ok: false, error: error.message };
  }
  return { ok: false, error: fallback };
}

function revalidateCategorySurfaces(categoryId?: string) {
  for (const path of [
    "/",
    "/marketplace",
    "/sell",
    "/seller/listings",
    "/admin",
    "/admin/categories",
  ]) {
    revalidatePath(path);
  }
  if (categoryId) revalidatePath(`/admin/categories/${categoryId}`);
}

function formValues(formData: FormData) {
  return {
    name: formData.get("name") ?? "",
    slug: formData.get("slug") ?? "",
    description: formData.get("description") ?? null,
    parent_id: formData.get("parent_id") ?? null,
  };
}

export async function createCategoryAction(
  formData: FormData,
): Promise<CategoryActionResult> {
  const actor = await requireAdminPermissionForAction(CATEGORY_PERMISSION);

  const parsed = categoryFormSchema.safeParse(formValues(formData));
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }

  try {
    const categories = await fetchAdminCategories();

    const nameConflict = findNameConflict(categories, parsed.data.name);
    if (nameConflict) {
      return {
        ok: false,
        errors: { name: ["A category with this name already exists."] },
      };
    }

    const slugConflict = findSlugConflict(categories, parsed.data.slug);
    if (slugConflict) {
      return {
        ok: false,
        errors: {
          slug: ["This slug is already in use. Choose a different one."],
        },
      };
    }

    const parent = validateCategoryParent(
      categories,
      null,
      parsed.data.parent_id,
    );
    if (!parent.ok) {
      return { ok: false, errors: { parent_id: [parent.error] } };
    }

    const siblings = categories.filter(
      (category) => category.parent_id === parsed.data.parent_id,
    );
    const id = await insertCategory(actor, {
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description,
      parent_id: parsed.data.parent_id,
      sort_order: nextSortOrder(siblings),
    });

    revalidateCategorySurfaces(id);
    return { ok: true, id, message: "Category created." };
  } catch (error) {
    return failFromStorage(error, READ_ERROR);
  }
}

export async function updateCategoryAction(
  formData: FormData,
): Promise<CategoryActionResult> {
  const actor = await requireAdminPermissionForAction(CATEGORY_PERMISSION);

  const parsed = categoryUpdateSchema.safeParse({
    id: formData.get("id") ?? "",
    ...formValues(formData),
  });
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }

  try {
    const categories = await fetchAdminCategories();
    const existing = categories.find(
      (category) => category.id === parsed.data.id,
    );
    if (!existing) {
      return {
        ok: false,
        error: "That category no longer exists. Refresh and try again.",
      };
    }

    const nameConflict = findNameConflict(
      categories,
      parsed.data.name,
      parsed.data.id,
    );
    if (nameConflict) {
      return {
        ok: false,
        errors: { name: ["A category with this name already exists."] },
      };
    }

    const slugConflict = findSlugConflict(
      categories,
      parsed.data.slug,
      parsed.data.id,
    );
    if (slugConflict) {
      return {
        ok: false,
        errors: {
          slug: ["This slug is already in use. Choose a different one."],
        },
      };
    }

    const parent = validateCategoryParent(
      categories,
      parsed.data.id,
      parsed.data.parent_id,
    );
    if (!parent.ok) {
      return { ok: false, errors: { parent_id: [parent.error] } };
    }

    const parentChanged = existing.parent_id !== parsed.data.parent_id;
    const siblings = categories.filter(
      (category) =>
        category.parent_id === parsed.data.parent_id &&
        category.id !== parsed.data.id,
    );

    await updateCategory(actor, parsed.data.id, {
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description,
      parent_id: parsed.data.parent_id,
      sort_order: parentChanged ? nextSortOrder(siblings) : existing.sort_order,
    });

    revalidateCategorySurfaces(parsed.data.id);
    return { ok: true, id: parsed.data.id, message: "Category saved." };
  } catch (error) {
    return failFromStorage(error, WRITE_ERROR);
  }
}

export async function setCategoryActiveAction(
  formData: FormData,
): Promise<CategoryActionResult> {
  const actor = await requireAdminPermissionForAction(CATEGORY_PERMISSION);

  const parsed = categoryActiveSchema.safeParse({
    category_id: formData.get("category_id") ?? "",
    is_active: formData.get("is_active") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, error: "That category could not be identified." };
  }

  try {
    const categories = await fetchAdminCategories();
    const existing = categories.find(
      (category) => category.id === parsed.data.category_id,
    );
    if (!existing) {
      return {
        ok: false,
        error: "That category no longer exists. Refresh and try again.",
      };
    }

    if (!parsed.data.is_active) {
      const descendants = getDescendantIds(categories, existing.id);
      const activeDescendantCount = descendants.filter(
        (id) => categories.find((category) => category.id === id)?.is_active,
      ).length;
      const check = evaluateCategoryDisable({ activeDescendantCount });
      if (!check.ok) return { ok: false, error: check.error };
    }

    await updateCategory(actor, existing.id, {
      is_active: parsed.data.is_active,
    });
    revalidateCategorySurfaces(existing.id);
    return {
      ok: true,
      id: existing.id,
      message: parsed.data.is_active
        ? "Category enabled."
        : "Category disabled.",
    };
  } catch (error) {
    return failFromStorage(error, WRITE_ERROR);
  }
}

export async function reorderCategoryAction(
  formData: FormData,
): Promise<CategoryActionResult> {
  const actor = await requireAdminPermissionForAction(CATEGORY_PERMISSION);

  const parsed = categoryReorderSchema.safeParse({
    category_id: formData.get("category_id") ?? "",
    direction: formData.get("direction") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, error: "That reorder request was not valid." };
  }

  try {
    const categories = await fetchAdminCategories();
    const plan = planCategoryReorder(
      categories,
      parsed.data.category_id,
      parsed.data.direction,
    );
    if (!plan.ok) {
      if (plan.reason === "missing") {
        return {
          ok: false,
          error: "That category no longer exists. Refresh and try again.",
        };
      }
      return {
        ok: true,
        message: "That category is already at the edge of its group.",
      };
    }

    for (const change of plan.changes) {
      await updateCategorySortOrder(actor, change.id, change.sort_order);
    }

    revalidateCategorySurfaces(parsed.data.category_id);
    return { ok: true, message: "Category order saved." };
  } catch (error) {
    return failFromStorage(error, WRITE_ERROR);
  }
}

export async function deleteCategoryAction(
  formData: FormData,
): Promise<CategoryActionResult> {
  const actor = await requireAdminPermissionForAction(CATEGORY_PERMISSION);

  const parsed = categoryIdSchema.safeParse({
    category_id: formData.get("category_id") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, error: "That category could not be identified." };
  }

  try {
    const [categories, counts] = await Promise.all([
      fetchAdminCategories(),
      fetchCategoryListingCounts(),
    ]);

    const existing = categories.find(
      (category) => category.id === parsed.data.category_id,
    );
    if (!existing) {
      return {
        ok: false,
        error: "That category no longer exists. Refresh and try again.",
      };
    }

    const childCount = categories.filter(
      (category) => category.parent_id === existing.id,
    ).length;
    const listingCount = counts.get(existing.id) ?? 0;

    const check = evaluateCategoryDeletion({ childCount, listingCount });
    if (!check.ok) return { ok: false, error: check.error };

    await deleteCategoryRow(actor, existing.id);
    revalidateCategorySurfaces(existing.id);
    return { ok: true, id: existing.id, message: "Category deleted." };
  } catch (error) {
    return failFromStorage(error, WRITE_ERROR);
  }
}

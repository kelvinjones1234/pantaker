import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { guardMock, revalidateMock, holder } = vi.hoisted(() => ({
  guardMock: vi.fn(async (_permission: string) => ({ id: "admin-1" })),
  revalidateMock: vi.fn(),
  holder: {
    categories: [] as Array<Record<string, unknown>>,
    counts: new Map<string, number>(),
    inserted: [] as Array<Record<string, unknown>>,
    updates: [] as Array<{ id: string; patch: Record<string, unknown> }>,
    sortUpdates: [] as Array<{ id: string; sort_order: number }>,
    deleted: [] as string[],
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: revalidateMock }));

vi.mock("@/features/admin/authorization", () => ({
  requireAdminPermissionForAction: (permission: string) => guardMock(permission),
}));

vi.mock("@/features/admin/category-queries", () => {
  class CategoryStorageError extends Error {
    readonly code?: string;

    constructor(message: string, code?: string) {
      super(message);
      this.name = "CategoryStorageError";
      this.code = code;
    }
  }

  return {
    CategoryStorageError,
    fetchAdminCategories: async () => holder.categories,
    fetchCategoryListingCounts: async () => holder.counts,
    insertCategory: async (_actor: unknown, input: Record<string, unknown>) => {
      holder.inserted.push(input);
      return "new-category";
    },
    updateCategory: async (_actor: unknown, id: string, patch: Record<string, unknown>) => {
      holder.updates.push({ id, patch });
    },
    updateCategorySortOrder: async (_actor: unknown, id: string, sortOrder: number) => {
      holder.sortUpdates.push({ id, sort_order: sortOrder });
    },
    deleteCategoryRow: async (_actor: unknown, id: string) => {
      holder.deleted.push(id);
    },
  };
});

import {
  createCategoryAction,
  deleteCategoryAction,
  reorderCategoryAction,
  setCategoryActiveAction,
  updateCategoryAction,
  type CategoryActionResult,
} from "@/features/admin/category-actions";

const METALS = "11111111-1111-4111-8111-111111111111";
const COPPER = "22222222-2222-4222-8222-222222222222";
const ROOT = "33333333-3333-4333-8333-333333333333";
const CHILD = "44444444-4444-4444-8444-444444444444";
const FIRST = "55555555-5555-4555-8555-555555555555";
const SECOND = "66666666-6666-4666-8666-666666666666";

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: METALS,
    name: "Metals",
    slug: "metals",
    description: null,
    parent_id: null,
    icon_key: null,
    sort_order: 0,
    is_active: true,
    ...overrides,
  };
}

function formData(entries: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

function messageOf(result: CategoryActionResult): string | undefined {
  return result.ok ? undefined : result.error;
}

beforeEach(() => {
  holder.categories = [];
  holder.counts = new Map();
  holder.inserted = [];
  holder.updates = [];
  holder.sortUpdates = [];
  holder.deleted = [];
  guardMock.mockImplementation(async (_permission: string) => ({ id: "admin-1" }));
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("createCategoryAction", () => {
  it("rejects a duplicate slug before writing", async () => {
    holder.categories = [row()];

    const result = await createCategoryAction(
      formData({ name: "Metals again", slug: "METALS", parent_id: "" }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors?.slug?.[0]).toMatch(/already in use/i);
    expect(holder.inserted).toHaveLength(0);
  });

  it("rejects a duplicate name before writing", async () => {
    holder.categories = [row()];

    const result = await createCategoryAction(
      formData({ name: "metals", slug: "metals-two", parent_id: "" }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors?.name?.[0]).toMatch(/already exists/i);
    expect(holder.inserted).toHaveLength(0);
  });

  it("creates a valid category and records the permission guard", async () => {
    const result = await createCategoryAction(
      formData({ name: "Copper", slug: "copper", parent_id: "", description: "Wire offcuts" }),
    );

    expect(result).toMatchObject({ ok: true, id: "new-category" });
    expect(guardMock).toHaveBeenCalledWith("listings.review");
    expect(holder.inserted[0]).toMatchObject({
      name: "Copper",
      slug: "copper",
      parent_id: null,
    });
    expect(revalidateMock).toHaveBeenCalledWith("/admin/categories");
  });

  it("rejects an unauthorized caller before touching category data", async () => {
    guardMock.mockImplementationOnce(async () => {
      throw new Error("AdminAuthorizationError");
    });

    await expect(
      createCategoryAction(formData({ name: "Copper", slug: "copper", parent_id: "" })),
    ).rejects.toThrow("AdminAuthorizationError");
    expect(holder.inserted).toHaveLength(0);
  });
});

describe("updateCategoryAction", () => {
  it("rejects a hierarchy that would contain a cycle", async () => {
    const root = row({ id: ROOT, name: "Root", slug: "root" });
    const child = row({ id: CHILD, name: "Child", slug: "child", parent_id: ROOT });
    holder.categories = [root, child];

    const result = await updateCategoryAction(
      formData({ id: ROOT, name: "Root", slug: "root", parent_id: CHILD }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors?.parent_id?.[0]).toMatch(/own subcategories/i);
    expect(holder.updates).toHaveLength(0);
  });

  it("rejects making a category its own parent", async () => {
    holder.categories = [row()];

    const result = await updateCategoryAction(
      formData({ id: METALS, name: "Metals", slug: "metals", parent_id: METALS }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors?.parent_id?.[0]).toMatch(/own parent/i);
    expect(holder.updates).toHaveLength(0);
  });

  it("refuses to silently move a category under a missing parent", async () => {
    holder.categories = [row()];

    const result = await updateCategoryAction(
      formData({
        id: METALS,
        name: "Metals",
        slug: "metals",
        parent_id: "d2c9e5a8-1f13-4d73-9d7b-0f5a4f3d8a11",
      }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors?.parent_id?.[0]).toMatch(/no longer exists/i);
    expect(holder.updates).toHaveLength(0);
  });
});

describe("deleteCategoryAction", () => {
  it("blocks deleting a category referenced by listings", async () => {
    holder.categories = [row()];
    holder.counts = new Map([[METALS, 3]]);

    const result = await deleteCategoryAction(formData({ category_id: METALS }));

    expect(result.ok).toBe(false);
    expect(messageOf(result)).toMatch(/disable it instead/i);
    expect(holder.deleted).toHaveLength(0);
  });

  it("blocks deleting a category that still has subcategories", async () => {
    holder.categories = [row(), row({ id: COPPER, name: "Copper", slug: "copper", parent_id: METALS })];

    const result = await deleteCategoryAction(formData({ category_id: METALS }));

    expect(result.ok).toBe(false);
    expect(messageOf(result)).toMatch(/subcategories/i);
    expect(holder.deleted).toHaveLength(0);
  });

  it("deletes an unused leaf", async () => {
    holder.categories = [row()];

    const result = await deleteCategoryAction(formData({ category_id: METALS }));

    expect(result).toMatchObject({ ok: true });
    expect(holder.deleted).toEqual([METALS]);
  });

  it("rejects an unauthorized deletion", async () => {
    guardMock.mockImplementationOnce(async () => {
      throw new Error("AdminAuthorizationError");
    });
    holder.categories = [row()];

    await expect(
      deleteCategoryAction(formData({ category_id: METALS })),
    ).rejects.toThrow("AdminAuthorizationError");
    expect(holder.deleted).toHaveLength(0);
  });
});

describe("reorderCategoryAction", () => {
  it("swaps a category with its adjacent sibling", async () => {
    holder.categories = [
      row({ id: FIRST, name: "First", slug: "first", sort_order: 0 }),
      row({ id: SECOND, name: "Second", slug: "second", sort_order: 10 }),
    ];

    const result = await reorderCategoryAction(
      formData({ category_id: SECOND, direction: "up" }),
    );

    expect(result).toMatchObject({ ok: true });
    expect(holder.sortUpdates).toEqual([
      { id: SECOND, sort_order: 0 },
      { id: FIRST, sort_order: 10 },
    ]);
  });
});

describe("setCategoryActiveAction", () => {
  it("refuses to disable a parent with active subcategories", async () => {
    holder.categories = [
      row(),
      row({ id: COPPER, name: "Copper", slug: "copper", parent_id: METALS }),
    ];

    const result = await setCategoryActiveAction(
      formData({ category_id: METALS, is_active: "false" }),
    );

    expect(result.ok).toBe(false);
    expect(messageOf(result)).toMatch(/active subcategories/i);
    expect(holder.updates).toHaveLength(0);
  });

  it("disables an active leaf without touching listing references", async () => {
    holder.categories = [row()];

    const result = await setCategoryActiveAction(
      formData({ category_id: METALS, is_active: "false" }),
    );

    expect(result).toMatchObject({ ok: true });
    expect(holder.updates).toEqual([{ id: METALS, patch: { is_active: false } }]);
  });
});

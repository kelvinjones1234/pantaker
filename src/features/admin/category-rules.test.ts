import { describe, expect, it } from "vitest";
import {
  buildCategoryTree,
  evaluateCategoryDeletion,
  evaluateCategoryDisable,
  findNameConflict,
  findSlugConflict,
  flattenCategoryTree,
  getDescendantIds,
  nextSortOrder,
  planCategoryReorder,
  validateCategoryParent,
  type AdminCategoryRecord,
} from "@/features/admin/category-rules";

function category(overrides: Partial<AdminCategoryRecord> & { id: string }): AdminCategoryRecord {
  return {
    name: "Category",
    slug: "category",
    description: null,
    parent_id: null,
    icon_key: null,
    sort_order: 0,
    is_active: true,
    ...overrides,
  };
}

describe("category hierarchy", () => {
  const metals = category({ id: "metals", name: "Metals", slug: "metals", sort_order: 0 });
  const copper = category({
    id: "copper",
    name: "Copper",
    slug: "copper",
    parent_id: "metals",
    sort_order: 0,
  });
  const aluminium = category({
    id: "aluminium",
    name: "Aluminium",
    slug: "aluminium",
    parent_id: "metals",
    sort_order: 10,
  });
  const plastics = category({ id: "plastics", name: "Plastics", slug: "plastics", sort_order: 10 });

  it("nests children under their parent and flattens with depth", () => {
    const flat = flattenCategoryTree(
      buildCategoryTree([aluminium, plastics, copper, metals]),
    );

    expect(flat.map(({ category: item, depth }) => [item.id, depth])).toEqual([
      ["metals", 0],
      ["copper", 1],
      ["aluminium", 1],
      ["plastics", 0],
    ]);
  });

  it("keeps orphans and existing loops visible as roots instead of dropping rows", () => {
    const orphan = category({ id: "orphan", parent_id: "missing" });
    const a = category({ id: "a", parent_id: "b" });
    const b = category({ id: "b", parent_id: "a" });

    const roots = buildCategoryTree([orphan, a, b]);
    const flat = flattenCategoryTree(roots);

    expect(flat.map(({ category: item }) => item.id).sort()).toEqual(["a", "b", "orphan"]);
  });

  it("lists descendants without looping forever", () => {
    expect(getDescendantIds([metals, copper, aluminium, plastics], "metals")).toEqual([
      "copper",
      "aluminium",
    ]);
  });
});

describe("uniqueness rules", () => {
  const rows = [
    category({ id: "one", name: "Vehicle parts", slug: "vehicle-parts" }),
    category({ id: "two", name: "Metals", slug: "metals" }),
  ];

  it("detects duplicate slugs case-insensitively", () => {
    expect(findSlugConflict(rows, "METALS")?.id).toBe("two");
    expect(findSlugConflict(rows, "metals", "two")).toBeUndefined();
    expect(findSlugConflict(rows, "copper")).toBeUndefined();
  });

  it("detects duplicate names case-insensitively, excluding the edited row", () => {
    expect(findNameConflict(rows, "vehicle PARTS")?.id).toBe("one");
    expect(findNameConflict(rows, "vehicle parts", "one")).toBeUndefined();
  });
});

describe("parent validation", () => {
  const root = category({ id: "root", name: "Root", slug: "root" });
  const child = category({ id: "child", name: "Child", slug: "child", parent_id: "root" });
  const grandchild = category({
    id: "grandchild",
    name: "Grandchild",
    slug: "grandchild",
    parent_id: "child",
  });
  const rows = [root, child, grandchild];

  it("accepts a top-level category and a real parent", () => {
    expect(validateCategoryParent(rows, null, null).ok).toBe(true);
    expect(validateCategoryParent(rows, "grandchild", "root").ok).toBe(true);
  });

  it("rejects self-parenting", () => {
    const result = validateCategoryParent(rows, "root", "root");
    expect(result).toEqual({ ok: false, error: "A category cannot be its own parent." });
  });

  it("rejects moving a category under its own descendant", () => {
    const result = validateCategoryParent(rows, "root", "grandchild");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/own subcategories/i);
  });

  it("rejects a missing parent", () => {
    const result = validateCategoryParent(rows, "root", "missing");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/no longer exists/i);
  });

  it("rejects extending an existing loop", () => {
    const a = category({ id: "a", parent_id: "b" });
    const b = category({ id: "b", parent_id: "a" });
    const result = validateCategoryParent([a, b], "outside", "a");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/contains a loop/i);
  });
});

describe("ordering", () => {
  const first = category({ id: "first", name: "First", sort_order: 0 });
  const second = category({ id: "second", name: "Second", sort_order: 0 });
  const third = category({ id: "third", name: "Third", sort_order: 30 });
  const rows = [first, second, third];

  it("appends new categories after the current siblings", () => {
    expect(nextSortOrder(rows)).toBe(40);
    expect(nextSortOrder([])).toBe(0);
  });

  it("swaps with the adjacent sibling and normalises positions", () => {
    const plan = planCategoryReorder(rows, "third", "up");
    expect(plan.ok).toBe(true);
    if (plan.ok) {
      expect(plan.changes).toEqual([
        { id: "third", sort_order: 10 },
        { id: "second", sort_order: 20 },
      ]);
    }
  });

  it("reports the edges and missing rows without writing", () => {
    expect(planCategoryReorder(rows, "first", "up")).toEqual({ ok: false, reason: "edge" });
    expect(planCategoryReorder(rows, "third", "down")).toEqual({ ok: false, reason: "edge" });
    expect(planCategoryReorder(rows, "missing", "up")).toEqual({ ok: false, reason: "missing" });
  });
});

describe("deletion and disabling", () => {
  it("refuses to delete a category that listings reference", () => {
    const result = evaluateCategoryDeletion({ listingCount: 4, childCount: 0 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/disable it instead/i);
  });

  it("refuses to delete a category with subcategories", () => {
    const result = evaluateCategoryDeletion({ listingCount: 0, childCount: 2 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/subcategories/i);
  });

  it("allows deleting an unused leaf", () => {
    expect(evaluateCategoryDeletion({ listingCount: 0, childCount: 0 })).toEqual({ ok: true });
  });

  it("refuses to disable a category with active descendants", () => {
    const result = evaluateCategoryDisable({ activeDescendantCount: 1 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/active subcategories/i);
  });

  it("allows disabling a category whose descendants are all disabled", () => {
    expect(evaluateCategoryDisable({ activeDescendantCount: 0 })).toEqual({ ok: true });
  });
});

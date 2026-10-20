/**
 * Pure category rules shared by the admin actions and UI.
 *
 * The database is the source of truth for the taxonomy; these helpers only
 * enforce what a safe tree looks like (one parent, no loops, no duplicate slugs)
 * and what may happen to a category that listings still reference. Keeping them
 * pure means the same rule is used by server actions and tests, and the UI can
 * hide choices the server would reject anyway.
 */

export interface AdminCategoryRecord {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parent_id: string | null;
  icon_key: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface CategoryTreeNode extends AdminCategoryRecord {
  children: CategoryTreeNode[];
}

export interface FlatCategoryNode {
  category: AdminCategoryRecord;
  depth: number;
}

function compareSiblings(a: AdminCategoryRecord, b: AdminCategoryRecord): number {
  if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
  return a.name.localeCompare(b.name, "en", { sensitivity: "base" });
}

/** True when walking up from `record` eventually revisits a node. */
function isInCycle(
  record: AdminCategoryRecord,
  byId: Map<string, AdminCategoryRecord>,
): boolean {
  const visited = new Set<string>([record.id]);
  let parentId = record.parent_id;
  while (parentId) {
    if (visited.has(parentId)) return true;
    visited.add(parentId);
    const parent = byId.get(parentId);
    if (!parent) return false;
    parentId = parent.parent_id;
  }
  return false;
}

/**
 * Build the stored tree. Orphaned rows and rows that point into a loop become
 * roots instead of disappearing, so an admin can still see and repair bad data.
 */
export function buildCategoryTree(categories: AdminCategoryRecord[]): CategoryTreeNode[] {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const nodes = new Map<string, CategoryTreeNode>(
    categories.map((category) => [category.id, { ...category, children: [] }]),
  );
  const roots: CategoryTreeNode[] = [];

  for (const category of categories) {
    const node = nodes.get(category.id)!;
    const parent = category.parent_id ? nodes.get(category.parent_id) : undefined;
    if (!parent || parent.id === node.id || isInCycle(category, byId)) {
      roots.push(node);
    } else {
      parent.children.push(node);
    }
  }

  const sort = (items: CategoryTreeNode[]) => {
    items.sort(compareSiblings);
    for (const item of items) sort(item.children);
  };
  sort(roots);
  return roots;
}

/** Depth-first flattening with a depth value for indentation. */
export function flattenCategoryTree(roots: CategoryTreeNode[]): FlatCategoryNode[] {
  const out: FlatCategoryNode[] = [];
  const seen = new Set<string>();

  const walk = (nodes: CategoryTreeNode[], depth: number) => {
    for (const node of nodes) {
      if (seen.has(node.id)) continue;
      seen.add(node.id);
      out.push({ category: node, depth });
      walk(node.children, depth + 1);
    }
  };

  walk(roots, 0);
  return out;
}

/** Ids of every descendant of `categoryId`, safe against existing loops. */
export function getDescendantIds(
  categories: AdminCategoryRecord[],
  categoryId: string,
): string[] {
  const childrenByParent = new Map<string, string[]>();
  for (const category of categories) {
    if (!category.parent_id) continue;
    const children = childrenByParent.get(category.parent_id) ?? [];
    children.push(category.id);
    childrenByParent.set(category.parent_id, children);
  }

  const result: string[] = [];
  const seen = new Set<string>([categoryId]);
  const queue = [...(childrenByParent.get(categoryId) ?? [])];
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    result.push(id);
    queue.push(...(childrenByParent.get(id) ?? []));
  }
  return result;
}

export function findSlugConflict(
  categories: AdminCategoryRecord[],
  slug: string,
  excludeId?: string,
): AdminCategoryRecord | undefined {
  const normalized = slug.trim().toLowerCase();
  return categories.find(
    (category) => category.id !== excludeId && category.slug.trim().toLowerCase() === normalized,
  );
}

export function findNameConflict(
  categories: AdminCategoryRecord[],
  name: string,
  excludeId?: string,
): AdminCategoryRecord | undefined {
  const normalized = name.trim().toLocaleLowerCase("en");
  return categories.find(
    (category) => category.id !== excludeId && category.name.trim().toLocaleLowerCase("en") === normalized,
  );
}

export type RuleResult = { ok: true } | { ok: false; error: string };

/**
 * A parent must exist, may not be the category itself, and may not be one of its
 * descendants. Walking the full ancestor chain also rejects an already-cyclic
 * dataset rather than extending the loop.
 */
export function validateCategoryParent(
  categories: AdminCategoryRecord[],
  categoryId: string | null,
  parentId: string | null,
): RuleResult {
  if (!parentId) return { ok: true };

  if (categoryId && parentId === categoryId) {
    return { ok: false, error: "A category cannot be its own parent." };
  }

  const byId = new Map(categories.map((category) => [category.id, category]));
  const parent = byId.get(parentId);
  if (!parent) {
    return { ok: false, error: "The selected parent category no longer exists. Choose another." };
  }

  const visited = new Set<string>();
  let cursor: AdminCategoryRecord | undefined = parent;
  while (cursor) {
    if (cursor.id === categoryId) {
      return {
        ok: false,
        error: "A category cannot sit inside one of its own subcategories.",
      };
    }
    if (visited.has(cursor.id)) {
      return {
        ok: false,
        error: "The existing category tree contains a loop. Repair that first, then try again.",
      };
    }
    visited.add(cursor.id);
    cursor = cursor.parent_id ? byId.get(cursor.parent_id) : undefined;
  }

  return { ok: true };
}

/** The next sort position at the end of a sibling group. */
export function nextSortOrder(siblings: AdminCategoryRecord[]): number {
  if (siblings.length === 0) return 0;
  return Math.max(...siblings.map((category) => category.sort_order)) + 10;
}

export type ReorderPlan =
  | { ok: true; changes: Array<{ id: string; sort_order: number }> }
  | { ok: false; reason: "missing" | "edge" };

/**
 * Swap a category with its adjacent sibling and normalise the sibling group to
 * stable 10-point positions. Returning the full plan means a duplicate or
 * negative sort_order in existing data is repaired at the same time.
 */
export function planCategoryReorder(
  categories: AdminCategoryRecord[],
  categoryId: string,
  direction: "up" | "down",
): ReorderPlan {
  const category = categories.find((item) => item.id === categoryId);
  if (!category) return { ok: false, reason: "missing" };

  const siblings = categories
    .filter((item) => item.parent_id === category.parent_id)
    .sort(compareSiblings);
  const index = siblings.findIndex((item) => item.id === categoryId);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= siblings.length) {
    return { ok: false, reason: "edge" };
  }

  [siblings[index], siblings[target]] = [siblings[target], siblings[index]];
  const changes = siblings.flatMap((item, position) => {
    const sortOrder = position * 10;
    return item.sort_order === sortOrder ? [] : [{ id: item.id, sort_order: sortOrder }];
  });
  return { ok: true, changes };
}

export function evaluateCategoryDeletion(input: {
  listingCount: number;
  childCount: number;
}): RuleResult {
  if (input.childCount > 0) {
    return {
      ok: false,
      error:
        "This category has subcategories. Move or delete them first so the hierarchy stays valid.",
    };
  }
  if (input.listingCount > 0) {
    return {
      ok: false,
      error: `This category is used by ${input.listingCount} listing${
        input.listingCount === 1 ? "" : "s"
      }. Disable it instead, or move those listings to another category first.`,
    };
  }
  return { ok: true };
}

export function evaluateCategoryDisable(input: {
  activeDescendantCount: number;
}): RuleResult {
  if (input.activeDescendantCount > 0) {
    return {
      ok: false,
      error:
        "Disable or move its active subcategories first, so no active category sits under a disabled parent.",
    };
  }
  return { ok: true };
}

import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  configured: true,
  counts: { listing: 0, profile: 0, category: 0 },
  byPath: {} as Record<string, number>,
  deleted: [] as string[],
  deleteError: null as Error | null,
}));

vi.mock("@/lib/prisma", () => ({
  isPrismaConfigured: () => state.configured,
  getPrisma: () => ({
    listingImage: {
      count: async (query: { where: { storage_path: string } }) =>
        state.byPath[query.where.storage_path] ?? state.counts.listing,
    },
    profile: {
      count: async (query: { where: { avatar_path: string } }) =>
        state.byPath[query.where.avatar_path] ?? state.counts.profile,
    },
    category: {
      count: async (query: { where: { icon_key: string } }) =>
        state.byPath[query.where.icon_key] ?? state.counts.category,
    },
  }),
}));

vi.mock("@/lib/image-storage", () => ({
  deleteStoredImage: async (key: string) => {
    if (state.deleteError) throw state.deleteError;
    state.deleted.push(key);
    return true;
  },
}));

const { countImageReferences, deleteUnreferencedImages } = await import(
  "@/lib/image-cleanup"
);

beforeEach(() => {
  state.configured = true;
  state.counts = { listing: 0, profile: 0, category: 0 };
  state.byPath = {};
  state.deleted = [];
  state.deleteError = null;
});

describe("countImageReferences", () => {
  it("sums listing, profile, and category references", async () => {
    state.counts = { listing: 1, profile: 2, category: 3 };
    await expect(countImageReferences("listings/u/a.webp")).resolves.toBe(6);
  });

  it("fails closed when the database or path is unavailable", async () => {
    await expect(countImageReferences("")).resolves.toBe(1);
    state.configured = false;
    await expect(countImageReferences("listings/u/a.webp")).resolves.toBe(1);
  });
});

describe("deleteUnreferencedImages", () => {
  it("deletes only unique, unreferenced keys", async () => {
    state.counts = { listing: 0, profile: 0, category: 0 };
    state.byPath = { "listings/u/referenced.webp": 1 };
    await deleteUnreferencedImages([
      "listings/u/referenced.webp",
      "listings/u/orphan.webp",
      "listings/u/orphan.webp",
      "",
    ]);
    expect(state.deleted).toEqual(["listings/u/orphan.webp"]);
  });

  it("does nothing when the database is unavailable", async () => {
    state.configured = false;
    await deleteUnreferencedImages(["listings/u/orphan.webp"]);
    expect(state.deleted).toEqual([]);
  });

  it("treats storage cleanup as best effort", async () => {
    state.deleteError = new Error("R2 unavailable");
    await expect(
      deleteUnreferencedImages(["listings/u/orphan.webp"]),
    ).resolves.toBeUndefined();
    expect(state.deleted).toEqual([]);
  });
});

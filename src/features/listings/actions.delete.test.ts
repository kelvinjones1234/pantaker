import { beforeEach, describe, expect, it, vi } from "vitest";

const USER = "11111111-1111-1111-1111-111111111111";
const OTHER = "22222222-2222-2222-2222-222222222222";
const LISTING = "33333333-3333-3333-3333-333333333333";
const IMAGE_KEY = `listings/${USER}/cover.webp`;

const state = vi.hoisted(() => ({
  record: {
    seller_id: "11111111-1111-1111-1111-111111111111",
    item_status: "published",
    images: [{ storage_path: "listings/11111111-1111-1111-1111-111111111111/cover.webp" }],
  } as {
    seller_id: string;
    item_status: string;
    images: { storage_path: string | null }[];
  } | null,
  activeOrder: { id: "order-1" } as { id: string } | null,
  activeSale: { id: "sale-1" } as { id: string } | null,
  deleteCalls: 0,
  deleteCount: 1,
  unreferenced: [] as string[][],
}));

vi.mock("@/features/auth/authorization", () => ({
  requireUserForAction: async () => ({ id: USER, admin_role: "" }),
}));

vi.mock("@/features/accounts/access", () => ({
  checkAccountCanWrite: async () => ({ ok: true }),
}));

vi.mock("@/lib/prisma", () => ({
  isPrismaConfigured: () => true,
  getPrisma: () => ({
    listing: { findUnique: async () => state.record },
  }),
}));

vi.mock("@/lib/db/context", () => ({
  withUserContext: async (
    _user: unknown,
    work: (tx: unknown) => Promise<unknown>,
  ) =>
    work({
      order: { findFirst: async () => state.activeOrder },
      sale: { findFirst: async () => state.activeSale },
      listing: {
        deleteMany: async () => {
          state.deleteCalls += 1;
          return { count: state.deleteCount };
        },
      },
    }),
}));

vi.mock("@/lib/image-cleanup", () => ({
  deleteUnreferencedImages: async (paths: string[]) => {
    state.unreferenced.push(paths);
  },
}));

const { deleteListingAction } = await import("@/features/listings/actions");

beforeEach(() => {
  state.record = {
    seller_id: USER,
    item_status: "published",
    images: [{ storage_path: IMAGE_KEY }],
  };
  state.activeOrder = null;
  state.activeSale = null;
  state.deleteCalls = 0;
  state.deleteCount = 1;
  state.unreferenced = [];
});

describe("deleteListingAction", () => {
  it("deletes a published listing and cleans up its images", async () => {
    const result = await deleteListingAction(LISTING);

    expect(result).toEqual({ ok: true });
    expect(state.deleteCalls).toBe(1);
    expect(state.unreferenced).toEqual([[IMAGE_KEY]]);
  });

  it("blocks deletion while an online order is active", async () => {
    state.activeOrder = { id: "order-1" };
    const result = await deleteListingAction(LISTING);

    expect(result).toMatchObject({ ok: false });
    expect(result.ok === false && result.error).toContain("active order");
    expect(state.deleteCalls).toBe(0);
    expect(state.unreferenced).toEqual([]);
  });

  it("blocks deletion while a manual sale is active", async () => {
    state.activeSale = { id: "sale-1" };
    const result = await deleteListingAction(LISTING);

    expect(result).toMatchObject({ ok: false });
    expect(result.ok === false && result.error).toContain("active sale");
    expect(state.deleteCalls).toBe(0);
  });

  it("does not let a seller delete another seller's listing", async () => {
    state.record = { ...state.record!, seller_id: OTHER };
    const result = await deleteListingAction(LISTING);

    expect(result).toMatchObject({ ok: false });
    expect(state.deleteCalls).toBe(0);
    expect(state.unreferenced).toEqual([]);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const USER = "11111111-1111-1111-1111-111111111111";
const OTHER = "22222222-2222-2222-2222-222222222222";
const CATEGORY = "44444444-4444-4444-4444-444444444444";
const LISTING = "33333333-3333-3333-3333-333333333333";
const IMAGE = "55555555-5555-5555-5555-555555555555";
const NEW_KEY = `listings/${USER}/${IMAGE}.webp`;
const OLD_KEY = "media/old-image.webp";

const state = vi.hoisted(() => ({
  user: {
    id: "11111111-1111-1111-1111-111111111111",
    admin_role: "",
  },
  access: { ok: true } as
    | { ok: true; error?: never }
    | { ok: false; error: string },
  owner: { seller_id: "11111111-1111-1111-1111-111111111111" } as {
    seller_id: string;
  } | null,
  currentImages: [] as { id: string; storage_path: string }[],
  transactionError: null as Error | null,
  updateCount: 1,
  deleted: [] as string[],
  unreferenced: [] as string[][],
  createdImages: [] as unknown[],
}));

vi.mock("@/features/auth/authorization", () => ({
  requireUserForAction: async () => state.user,
}));

vi.mock("@/features/accounts/access", () => ({
  checkAccountCanWrite: async () => state.access,
}));

vi.mock("@/lib/prisma", () => ({
  isPrismaConfigured: () => true,
  getPrisma: () => ({
    listing: {
      findUnique: async () => state.owner,
    },
    listingImage: {
      findMany: async () => state.currentImages,
    },
  }),
}));

vi.mock("@/lib/db/context", () => ({
  withUserContext: async (
    _user: unknown,
    work: (tx: unknown) => Promise<unknown>,
  ) => {
    if (state.transactionError) throw state.transactionError;
    return work({
      listing: {
        create: async () => ({ id: LISTING }),
        updateMany: async () => ({ count: state.updateCount }),
      },
      listingImage: {
        createMany: async (input: unknown) => {
          state.createdImages.push(input);
        },
        create: async (input: unknown) => {
          state.createdImages.push(input);
        },
        update: async () => ({}),
        deleteMany: async () => ({}),
        findMany: async () => state.currentImages,
      },
    });
  },
}));

vi.mock("@/lib/image-storage", () => ({
  assertImageObjectsExist: async () => undefined,
  deleteStoredImage: async (key: string) => {
    state.deleted.push(key);
    return true;
  },
}));

vi.mock("@/lib/image-cleanup", () => ({
  deleteUnreferencedImages: async (paths: string[]) => {
    state.unreferenced.push(paths);
  },
}));

const { createListingAction, updateListingAction } = await import(
  "@/features/listings/actions"
);

function formData(overrides: Record<string, string> = {}): FormData {
  const form = new FormData();
  form.set("title", "Used office chair");
  form.set("category_id", CATEGORY);
  form.set(
    "description",
    "A sturdy office chair with minor wear and no structural damage.",
  );
  form.set("condition", "used");
  form.set("pricing_type", "free");
  form.set("city", "Lagos");
  form.set("intent", "publish");
  form.set("image_ids", JSON.stringify([NEW_KEY]));
  for (const [key, value] of Object.entries(overrides)) form.set(key, value);
  return form;
}

beforeEach(() => {
  state.access = { ok: true };
  state.owner = { seller_id: USER };
  state.currentImages = [];
  state.transactionError = null;
  state.updateCount = 1;
  state.deleted = [];
  state.unreferenced = [];
  state.createdImages = [];
});

describe("createListingAction image lifecycle", () => {
  it("creates a listing with an owned image key", async () => {
    const result = await createListingAction(formData());
    expect(result).toMatchObject({ ok: true, id: LISTING });
    expect(state.deleted).toEqual([]);
  });

  it("deletes newly uploaded images when the database write fails", async () => {
    state.transactionError = new Error("database unavailable");
    const result = await createListingAction(formData());
    expect(result).toMatchObject({ ok: false });
    expect(state.deleted).toEqual([NEW_KEY]);
  });

  it("rejects foreign image keys before touching the database", async () => {
    const result = await createListingAction(
      formData({
        image_ids: JSON.stringify([
          `listings/${OTHER}/${IMAGE}.webp`,
        ]),
      }),
    );
    expect(result).toMatchObject({ ok: false });
    expect(state.deleted).toEqual([]);
    expect(state.createdImages).toEqual([]);
  });
});

describe("updateListingAction image lifecycle", () => {
  it("rejects edits to another seller's listing", async () => {
    state.owner = { seller_id: OTHER };
    const result = await updateListingAction(
      LISTING,
      formData({ image_ids: JSON.stringify([NEW_KEY]) }),
    );
    expect(result).toMatchObject({ ok: false });
    expect(state.deleted).toEqual([]);
  });

  it("deletes newly uploaded images when the update transaction fails", async () => {
    state.currentImages = [{ id: "row-1", storage_path: OLD_KEY }];
    state.transactionError = new Error("database unavailable");
    const result = await updateListingAction(
      LISTING,
      formData({ image_ids: JSON.stringify([NEW_KEY]) }),
    );
    expect(result).toMatchObject({ ok: false });
    expect(state.deleted).toEqual([NEW_KEY]);
    expect(state.deleted).not.toContain(OLD_KEY);
  });

  it("keeps existing images attached during an edit", async () => {
    state.currentImages = [{ id: "row-1", storage_path: OLD_KEY }];
    const result = await updateListingAction(
      LISTING,
      formData({ image_ids: JSON.stringify([OLD_KEY, NEW_KEY]) }),
    );
    expect(result).toMatchObject({ ok: true });
    expect(state.deleted).toEqual([]);
  });
});

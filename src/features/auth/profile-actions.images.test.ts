import { beforeEach, describe, expect, it, vi } from "vitest";

const USER = "11111111-1111-1111-1111-111111111111";
const OTHER = "22222222-2222-2222-2222-222222222222";
const IMAGE = "33333333-3333-3333-3333-333333333333";
const AVATAR = `profiles/${USER}/${IMAGE}.webp`;
const OLD_AVATAR = "media/old-avatar.webp";

const state = vi.hoisted(() => ({
  user: {
    id: "11111111-1111-1111-1111-111111111111",
    admin_role: "",
  },
  access: { ok: true } as
    | { ok: true; error?: never }
    | { ok: false; error: string },
  currentAvatar: null as string | null,
  upsertError: null as Error | null,
  deleted: [] as string[],
  unreferenced: [] as string[][],
  upserted: [] as unknown[],
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
    profile: {
      findUnique: async () => ({ avatar_path: state.currentAvatar }),
      findFirst: async () => null,
      upsert: async (input: unknown) => {
        if (state.upsertError) throw state.upsertError;
        state.upserted.push(input);
      },
    },
  }),
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

const { updateProfileAction } = await import(
  "@/features/auth/profile-actions"
);

function formData(avatar = AVATAR): FormData {
  const form = new FormData();
  form.set("display_name", "Ada Okafor");
  form.set("username", "ada_okafor");
  form.set("account_type", "individual");
  if (avatar) form.set("avatar_path", avatar);
  return form;
}

beforeEach(() => {
  state.access = { ok: true };
  state.currentAvatar = null;
  state.upsertError = null;
  state.deleted = [];
  state.unreferenced = [];
  state.upserted = [];
});

describe("updateProfileAction avatar lifecycle", () => {
  it("saves a new owned avatar", async () => {
    const result = await updateProfileAction(formData());
    expect(result).toEqual({ ok: true });
    expect(state.deleted).toEqual([]);
    expect(state.unreferenced).toEqual([]);
  });

  it("deletes the newly uploaded avatar when the database write fails", async () => {
    state.upsertError = new Error("database unavailable");
    const result = await updateProfileAction(formData());
    expect(result).toMatchObject({ ok: false });
    expect(state.deleted).toEqual([AVATAR]);
  });

  it("deletes the previous avatar only after a successful replacement", async () => {
    state.currentAvatar = OLD_AVATAR;
    const result = await updateProfileAction(formData());
    expect(result).toEqual({ ok: true });
    expect(state.unreferenced).toEqual([[OLD_AVATAR]]);
  });

  it("rejects avatars under another user's prefix", async () => {
    const result = await updateProfileAction(
      formData(`profiles/${OTHER}/${IMAGE}.webp`),
    );
    expect(result).toMatchObject({ ok: false });
    expect(state.upserted).toEqual([]);
  });

  it("retains the current legacy avatar without treating it as a new upload", async () => {
    state.currentAvatar = OLD_AVATAR;
    const result = await updateProfileAction(formData(OLD_AVATAR));
    expect(result).toEqual({ ok: true });
    expect(state.deleted).toEqual([]);
    expect(state.unreferenced).toEqual([]);
  });
});

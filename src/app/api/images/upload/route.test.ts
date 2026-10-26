import { beforeEach, describe, expect, it, vi } from "vitest";

const USER = "11111111-1111-1111-1111-111111111111";
const OTHER = "22222222-2222-2222-2222-222222222222";
const LISTING = "33333333-3333-3333-3333-333333333333";

const state = vi.hoisted(() => ({
  user: { id: "11111111-1111-1111-1111-111111111111" } as {
    id: string;
  } | null,
  access: { ok: true } as
    | { ok: true; error?: never }
    | { ok: false; error: string },
  configured: true,
  local: false,
  uploadCount: 0,
  listing: null as { seller_id: string } | null,
  uploadCreateError: null as Error | null,
  storeError: null as Error | null,
  stored: [] as { key: string; contentType: string }[],
  deleted: [] as string[],
  savedLocal: [] as string[],
}));

vi.mock("@/features/auth/queries", () => ({
  getAuthUser: async () => state.user,
}));

vi.mock("@/features/accounts/access", () => ({
  checkAccountCanWrite: async () => state.access,
}));

vi.mock("@/lib/image-storage", () => ({
  isImageStorageConfigured: () => state.configured,
  storeImageObject: async (input: { key: string; contentType: string }) => {
    if (state.storeError) throw state.storeError;
    state.stored.push(input);
  },
  assertImageObjectsExist: async () => undefined,
  deleteStoredImage: async (key: string) => {
    state.deleted.push(key);
    return true;
  },
}));

vi.mock("@/lib/local/flags", () => ({
  isLocalImageMode: () => state.local,
}));

vi.mock("@/lib/local/images", () => ({
  newLocalImageId: () => `local-${LISTING}`,
  saveLocalImageBytes: async (id: string) => {
    state.savedLocal.push(id);
  },
}));

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    uploadRequest: {
      count: async () => state.uploadCount,
      create: async () => {
        if (state.uploadCreateError) throw state.uploadCreateError;
      },
    },
    listing: {
      findUnique: async () => state.listing,
    },
  }),
}));

vi.mock("@/lib/storage/image-processing", () => ({
  processUploadedImage: async () => ({
    bytes: Buffer.from("processed-webp"),
    width: 120,
    height: 80,
    contentType: "image/webp",
    extension: "webp",
  }),
  validateDeclaredImageType: (type: string) =>
    new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]).has(
      type.toLowerCase(),
    )
      ? null
      : "Use a JPEG, PNG, WebP, or AVIF image.",
}));

const { POST } = await import("@/app/api/images/upload/route");

function uploadRequest(
  fields: Record<string, string> = {},
  file?: File,
): Request {
  const form = new FormData();
  form.set("purpose", fields.purpose ?? "listing");
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  if (file) form.set("file", file);
  return new Request("http://localhost:3000/api/images/upload", {
    method: "POST",
    body: form,
  });
}

function validFile(): File {
  return new File([Uint8Array.from([1, 2, 3, 4])], "photo.png", {
    type: "image/png",
  });
}

beforeEach(() => {
  state.user = { id: USER };
  state.access = { ok: true };
  state.configured = true;
  state.local = false;
  state.uploadCount = 0;
  state.listing = null;
  state.uploadCreateError = null;
  state.storeError = null;
  state.stored = [];
  state.deleted = [];
  state.savedLocal = [];
});

describe("POST /api/images/upload", () => {
  it("returns 501 when image storage is not configured", async () => {
    state.configured = false;
    const response = await POST(uploadRequest());
    expect(response.status).toBe(501);
  });

  it("requires authentication", async () => {
    state.user = null;
    const response = await POST(uploadRequest());
    expect(response.status).toBe(401);
  });

  it("blocks read-only accounts", async () => {
    state.access = { ok: false, error: "Your account is read only." };
    const response = await POST(uploadRequest());
    expect(response.status).toBe(403);
  });

  it("enforces the hourly upload limit", async () => {
    state.uploadCount = 30;
    const response = await POST(uploadRequest({}, validFile()));
    expect(response.status).toBe(429);
  });

  it("requires a valid purpose and a file", async () => {
    expect((await POST(uploadRequest({ purpose: "other" }))).status).toBe(400);
    expect((await POST(uploadRequest({ purpose: "listing" }))).status).toBe(400);
  });

  it("validates listing ownership before accepting the file", async () => {
    state.listing = { seller_id: OTHER };
    const response = await POST(
      uploadRequest({ listingId: LISTING }, validFile()),
    );
    expect(response.status).toBe(403);
    expect(state.stored).toEqual([]);
  });

  it("rejects missing listings and malformed listing IDs", async () => {
    state.listing = null;
    expect(
      (await POST(uploadRequest({ listingId: LISTING }, validFile()))).status,
    ).toBe(404);
    expect(
      (await POST(uploadRequest({ listingId: "bad" }, validFile()))).status,
    ).toBe(400);
  });

  it("rejects empty, oversized, and unsupported files", async () => {
    expect(
      (
        await POST(
          uploadRequest(
            {},
            new File([], "empty.png", { type: "image/png" }),
          ),
        )
      ).status,
    ).toBe(400);

    expect(
      (
        await POST(
          uploadRequest(
            {},
            new File([Buffer.alloc(10 * 1024 * 1024 + 1)], "big.png", {
              type: "image/png",
            }),
          ),
        )
      ).status,
    ).toBe(413);

    expect(
      (
        await POST(
          uploadRequest(
            {},
            new File([Uint8Array.from([1])], "doc.svg", {
              type: "image/svg+xml",
            }),
          ),
        )
      ).status,
    ).toBe(400);
  });

  it("does not store an object when the database write fails", async () => {
    state.uploadCreateError = new Error("database unavailable");
    const response = await POST(uploadRequest({}, validFile()));
    expect(response.status).toBe(503);
    expect(state.stored).toEqual([]);
  });

  it("stores successful listing uploads and returns the generated key", async () => {
    const response = await POST(uploadRequest({}, validFile()));
    expect(response.status).toBe(201);
    const body = (await response.json()) as { key: string };
    expect(body.key).toMatch(
      new RegExp(`^listings/${USER}/[0-9a-f-]+\\.webp$`),
    );
    expect(state.stored).toHaveLength(1);
    expect(state.stored[0].contentType).toBe("image/webp");
  });

  it("stores successful profile uploads under the profile prefix", async () => {
    const response = await POST(
      uploadRequest({ purpose: "profile" }, validFile()),
    );
    expect(response.status).toBe(201);
    const body = (await response.json()) as { key: string };
    expect(body.key).toMatch(new RegExp(`^profiles/${USER}/`));
  });

  it("deletes the uploaded object when storage verification fails", async () => {
    state.storeError = new Error("R2 unavailable");
    const response = await POST(uploadRequest({}, validFile()));
    expect(response.status).toBe(502);
    expect(state.deleted).toHaveLength(1);
    expect(state.deleted[0]).toMatch(new RegExp(`^listings/${USER}/`));
  });

  it("uses local storage in local mode without touching R2", async () => {
    state.local = true;
    const response = await POST(uploadRequest({}, validFile()));
    expect(response.status).toBe(201);
    const body = (await response.json()) as { key: string };
    expect(body.key).toBe(`local-${LISTING}`);
    expect(state.stored).toEqual([]);
    expect(state.savedLocal).toEqual([`local-${LISTING}`]);
  });
});

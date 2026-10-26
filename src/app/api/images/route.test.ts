import { beforeEach, describe, expect, it, vi } from "vitest";

const USER = "11111111-1111-1111-1111-111111111111";
const OTHER = "22222222-2222-2222-2222-222222222222";
const IMAGE = "33333333-3333-3333-3333-333333333333";
const OWN = `listings/${USER}/${IMAGE}.webp`;

const state = vi.hoisted(() => ({
  user: { id: "11111111-1111-1111-1111-111111111111" } as {
    id: string;
  } | null,
  access: { ok: true } as
    | { ok: true; error?: never }
    | { ok: false; error: string },
  configured: true,
  local: false,
  references: 0,
  deleteResult: true,
  deleted: [] as string[],
}));

vi.mock("@/features/auth/queries", () => ({
  getAuthUser: async () => state.user,
}));

vi.mock("@/features/accounts/access", () => ({
  checkAccountCanWrite: async () => state.access,
}));

vi.mock("@/lib/image-cleanup", () => ({
  countImageReferences: async () => state.references,
}));

vi.mock("@/lib/image-storage", () => ({
  deleteStoredImage: async (key: string) => {
    state.deleted.push(key);
    return state.deleteResult;
  },
}));

vi.mock("@/lib/local/flags", () => ({
  isLocalImageMode: () => state.local,
}));

vi.mock("@/lib/prisma", () => ({
  isPrismaConfigured: () => state.configured,
}));

const { DELETE } = await import("@/app/api/images/route");

function deleteRequest(key: unknown, origin?: string): Request {
  return new Request("http://localhost:3000/api/images", {
    method: "DELETE",
    headers: {
      "content-type": "application/json",
      ...(origin ? { origin } : {}),
    },
    body: JSON.stringify({ key }),
  });
}

beforeEach(() => {
  state.user = { id: USER };
  state.access = { ok: true };
  state.configured = true;
  state.local = false;
  state.references = 0;
  state.deleteResult = true;
  state.deleted = [];
});

describe("DELETE /api/images", () => {
  it("rejects cross-site mutations", async () => {
    const response = await DELETE(deleteRequest(OWN, "https://evil.example.com"));
    expect(response.status).toBe(403);
    expect(state.deleted).toEqual([]);
  });

  it("requires authentication and write access", async () => {
    state.user = null;
    expect((await DELETE(deleteRequest(OWN))).status).toBe(401);
    state.user = { id: USER };
    state.access = { ok: false, error: "Read only." };
    expect((await DELETE(deleteRequest(OWN))).status).toBe(403);
  });

  it("validates key ownership and privacy", async () => {
    expect((await DELETE(deleteRequest(""))).status).toBe(400);
    expect(
      (await DELETE(deleteRequest(`listings/${OTHER}/${IMAGE}.webp`))).status,
    ).toBe(403);
    expect(
      (await DELETE(deleteRequest("private/verification/user/doc.webp"))).status,
    ).toBe(400);
    expect(state.deleted).toEqual([]);
  });

  it("refuses to delete a key that is still referenced", async () => {
    state.references = 1;
    const response = await DELETE(deleteRequest(OWN));
    expect(response.status).toBe(409);
    expect(state.deleted).toEqual([]);
  });

  it("requires database configuration", async () => {
    state.configured = false;
    expect((await DELETE(deleteRequest(OWN))).status).toBe(503);
  });

  it("deletes an unreferenced owned object", async () => {
    const response = await DELETE(deleteRequest(OWN));
    expect(response.status).toBe(200);
    expect(state.deleted).toEqual([OWN]);
  });

  it("returns 502 when storage deletion fails", async () => {
    state.deleteResult = false;
    expect((await DELETE(deleteRequest(OWN))).status).toBe(502);
  });

  it("allows deleting an owned local development image", async () => {
    state.local = true;
    const localId = `local-${IMAGE}`;
    const response = await DELETE(deleteRequest(localId));
    expect(response.status).toBe(200);
    expect(state.deleted).toEqual([localId]);
  });
});

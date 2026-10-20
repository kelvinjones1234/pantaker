import { afterEach, describe, expect, it, vi } from "vitest";

const { redirectMock, getUserMock, accessMock } = vi.hoisted(() => ({
  redirectMock: vi.fn((path: string): never => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
  getUserMock: vi.fn(),
  accessMock: vi.fn(async () => ({ status: "active", endsAt: null })),
}));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => redirectMock(path),
}));

vi.mock("@/features/auth/queries", () => ({
  getAuthUser: () => getUserMock(),
}));
vi.mock("@/features/accounts/access", () => ({
  getAccountAccessState: () => Promise.resolve(accessMock()),
}));

import {
  isAuthConfigured,
  requireSeller,
  requireUserForAction,
} from "@/features/auth/authorization";

function configureAuth() {
  vi.stubEnv("DATABASE_URL", "postgresql://user:pass@localhost:5432/pantaker");
  vi.stubEnv("AUTH_SECRET", "test-secret");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  accessMock.mockResolvedValue({ status: "active", endsAt: null });
});

describe("requireSeller", () => {
  it("returns the session user when signed in", async () => {
    configureAuth();
    vi.stubEnv("NODE_ENV", "production");
    getUserMock.mockResolvedValue({ id: "seller-a", email: "a@example.com" });

    const user = await requireSeller("/seller");
    expect(user).toMatchObject({ id: "seller-a" });
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("redirects a suspended existing session to the suspension notice", async () => {
    configureAuth();
    vi.stubEnv("NODE_ENV", "production");
    getUserMock.mockResolvedValue({ id: "seller-a", email: "a@example.com" });
    accessMock.mockResolvedValueOnce({ status: "suspended", endsAt: null });

    await expect(requireSeller("/seller")).rejects.toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/account-suspended");
  });

  it("redirects guests to sign in when auth is configured in production", async () => {
    configureAuth();
    vi.stubEnv("NODE_ENV", "production");
    getUserMock.mockResolvedValue(null);

    await expect(requireSeller("/seller/listings")).rejects.toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/login?next=%2Fseller%2Flistings");
  });

  it("stays in preview (no redirect) only when unconfigured or preview is allowed", async () => {
    vi.stubEnv("NODE_ENV", "development");
    getUserMock.mockResolvedValue(null);

    await expect(requireSeller("/seller")).resolves.toBeNull();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("treats an auth lookup failure as unauthenticated", async () => {
    configureAuth();
    vi.stubEnv("NODE_ENV", "production");
    getUserMock.mockRejectedValue(new Error("network"));

    await expect(requireSeller("/seller")).rejects.toThrow("NEXT_REDIRECT");
  });
});

describe("requireUserForAction", () => {
  it("never previews — anonymous mutations are redirected", async () => {
    vi.stubEnv("NODE_ENV", "development");
    getUserMock.mockResolvedValue(null);

    await expect(requireUserForAction("/seller/listings")).rejects.toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/login?next=%2Fseller%2Flistings");
  });

  it("returns the user for authenticated actions", async () => {
    configureAuth();
    getUserMock.mockResolvedValue({ id: "seller-a" });

    await expect(requireUserForAction()).resolves.toMatchObject({ id: "seller-a" });
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("redirects a suspended session to the suspension notice", async () => {
    configureAuth();
    getUserMock.mockResolvedValue({ id: "seller-a" });
    accessMock.mockResolvedValueOnce({ status: "suspended", endsAt: null });

    await expect(requireUserForAction()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/account-suspended");
  });
});

describe("isAuthConfigured", () => {
  it("is false without database and auth env vars", () => {
    expect(isAuthConfigured()).toBe(false);
  });

  it("is true when the database and auth secret are present", () => {
    configureAuth();
    expect(isAuthConfigured()).toBe(true);
  });
});

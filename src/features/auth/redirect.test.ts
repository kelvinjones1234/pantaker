import { describe, expect, it } from "vitest";
import { loginRedirectPath } from "@/features/auth/redirect";

describe("loginRedirectPath", () => {
  it("preserves a same-origin path", () => {
    expect(loginRedirectPath("/seller/listings")).toBe(
      "/login?next=%2Fseller%2Flistings",
    );
  });

  it("falls back for protocol-relative and absolute targets", () => {
    expect(loginRedirectPath("//evil.com")).toBe("/login?next=%2Fseller");
    expect(loginRedirectPath("https://evil.com")).toBe("/login?next=%2Fseller");
    expect(loginRedirectPath("")).toBe("/login?next=%2Fseller");
  });

  it("rejects backslash smuggling", () => {
    expect(loginRedirectPath("/\\evil.com")).toBe("/login?next=%2Fseller");
  });

  it("honours a custom fallback", () => {
    expect(loginRedirectPath("//evil.com", "/sell")).toBe("/login?next=%2Fsell");
  });
});

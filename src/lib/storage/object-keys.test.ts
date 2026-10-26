import { describe, expect, it } from "vitest";
import {
  buildPublicObjectUrl,
  isListingImageKeyForUser,
  isPrivateObjectKey,
  isProfileImageKeyForUser,
  isSafeObjectKey,
  normalizePublicBaseUrl,
  profileImageKey,
  trustedLegacyImageUrl,
} from "@/lib/storage/object-keys";

const USER = "11111111-1111-1111-1111-111111111111";
const OTHER = "22222222-2222-2222-2222-222222222222";
const IMAGE = "33333333-3333-3333-3333-333333333333";

describe("object key validation", () => {
  it("accepts generated listing and profile keys", () => {
    expect(isSafeObjectKey(`listings/${USER}/${IMAGE}.webp`)).toBe(true);
    expect(isSafeObjectKey(`profiles/${USER}/${IMAGE}.webp`)).toBe(true);
    expect(isSafeObjectKey(`migrated/listings/${IMAGE}/${"a".repeat(64)}.webp`)).toBe(true);
  });

  it("rejects traversal, encoded traversal, and malformed paths", () => {
    for (const key of [
      "../media/a.webp",
      "listings/../profiles/a.webp",
      "listings//a.webp",
      "/listings/a.webp",
      "listings/a.webp/",
      "listings\\a.webp",
      "listings/%2e%2e/a.webp",
      "listings/a b.webp",
      "private/x/a.webp/../b.webp",
      "barelegacyid",
    ]) {
      expect(isSafeObjectKey(key)).toBe(false);
    }
  });

  it("checks ownership by user prefix and purpose", () => {
    expect(isListingImageKeyForUser(`listings/${USER}/${IMAGE}.webp`, USER)).toBe(true);
    expect(isListingImageKeyForUser(`listings/${OTHER}/${IMAGE}.webp`, USER)).toBe(false);
    expect(isProfileImageKeyForUser(`profiles/${USER}/${IMAGE}.webp`, USER)).toBe(true);
    expect(isProfileImageKeyForUser(`listings/${USER}/${IMAGE}.webp`, USER)).toBe(false);
    expect(isProfileImageKeyForUser(`profiles/${OTHER}/${IMAGE}.webp`, USER)).toBe(false);
  });

  it("detects private keys", () => {
    expect(isPrivateObjectKey("private/verification/user/file.webp")).toBe(true);
    expect(isPrivateObjectKey("listings/user/file.webp")).toBe(false);
  });
});

describe("public URL construction", () => {
  it("trims trailing slashes and builds one clean URL", () => {
    expect(
      buildPublicObjectUrl(
        `listings/${USER}/${IMAGE}.webp`,
        "https://cdn.example.com///",
      ),
    ).toBe(`https://cdn.example.com/listings/${USER}/${IMAGE}.webp`);
  });

  it("adds a protocol when the configured domain omits one", () => {
    expect(normalizePublicBaseUrl("cdn.example.com/")).toBe(
      "https://cdn.example.com",
    );
  });

  it("rejects malformed public domains", () => {
    expect(() => normalizePublicBaseUrl("https://cdn.example.com/base")).toThrow();
    expect(() => normalizePublicBaseUrl("https://cdn.example.com?x=1")).toThrow();
    expect(() => normalizePublicBaseUrl("https://user:pass@cdn.example.com")).toThrow();
    expect(() => normalizePublicBaseUrl("")).toThrow();
  });

  it("never produces a public URL for a private object", () => {
    expect(() =>
      buildPublicObjectUrl(
        "private/verification/user/doc.webp",
        "https://cdn.example.com",
      ),
    ).toThrow(/private/i);
  });

  it("rejects malformed keys instead of double-encoding them", () => {
    expect(() =>
      buildPublicObjectUrl("listings/../a.webp", "https://cdn.example.com"),
    ).toThrow();
  });

  it("generates purpose-scoped keys", () => {
    expect(profileImageKey(USER, IMAGE)).toBe(`profiles/${USER}/${IMAGE}.webp`);
  });
});

describe("trusted legacy URLs", () => {
  it("accepts only allowlisted hosts", () => {
    expect(
      trustedLegacyImageUrl(
        "https://imagedelivery.net/hash/id/public",
        ["imagedelivery.net"],
      ),
    ).toBe("https://imagedelivery.net/hash/id/public");
    expect(
      trustedLegacyImageUrl("https://evil.example.com/image.jpg", [
        "imagedelivery.net",
      ]),
    ).toBeNull();
  });

  it("rejects credentials and non-http schemes", () => {
    expect(
      trustedLegacyImageUrl("https://user:pass@imagedelivery.net/x", [
        "imagedelivery.net",
      ]),
    ).toBeNull();
    expect(
      trustedLegacyImageUrl("javascript:alert(1)", ["imagedelivery.net"]),
    ).toBeNull();
  });
});

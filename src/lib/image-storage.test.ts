import { afterEach, describe, expect, it, vi } from "vitest";
import {
  deleteStoredImage,
  deliveryUrl,
  imageObjectExists,
  isImageStorageConfigured,
} from "@/lib/image-storage";

const USER = "11111111-1111-1111-1111-111111111111";
const IMAGE = "33333333-3333-3333-3333-333333333333";
const KEY = `listings/${USER}/${IMAGE}.webp`;

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("deliveryUrl", () => {
  it("builds public URLs for stored object keys", () => {
    vi.stubEnv("NEXT_PUBLIC_R2_PUBLIC_DOMAIN", "https://cdn.example.com/");
    expect(deliveryUrl(KEY)).toBe(`https://cdn.example.com/${KEY}`);
  });

  it("refuses private object keys", () => {
    vi.stubEnv("NEXT_PUBLIC_R2_PUBLIC_DOMAIN", "https://cdn.example.com");
    expect(() =>
      deliveryUrl("private/verification/user/document.webp"),
    ).toThrow(/private/i);
  });

  it("supports trusted legacy absolute URLs", () => {
    expect(
      deliveryUrl("https://imagedelivery.net/hash/id/public"),
    ).toBe("https://imagedelivery.net/hash/id/public");
    expect(() =>
      deliveryUrl("https://evil.example.com/image.jpg"),
    ).toThrow(/not trusted/i);
  });

  it("maps bare legacy Cloudflare Images IDs through the delivery hash", () => {
    vi.stubEnv(
      "NEXT_PUBLIC_CLOUDFLARE_IMAGES_DELIVERY_HASH",
      "delivery-hash",
    );
    expect(deliveryUrl("legacy_image-id")).toBe(
      "https://imagedelivery.net/delivery-hash/legacy_image-id/public",
    );
  });

  it("returns existing embedded data images and rejects oversized ones", () => {
    const data = "data:image/png;base64,aGVsbG8=";
    expect(deliveryUrl(data)).toBe(data);
    expect(() =>
      deliveryUrl(`data:image/png;base64,${"a".repeat(6_000_001)}`),
    ).toThrow(/too large/i);
  });

  it("handles local image IDs only in local mode", () => {
    vi.stubEnv("PANTAKER_IMAGE_MODE", "local");
    expect(deliveryUrl(`local-${IMAGE}`)).toBe(
      `/api/local-images/local-${IMAGE}`,
    );

    vi.stubEnv("PANTAKER_IMAGE_MODE", "r2");
    expect(() => deliveryUrl(`local-${IMAGE}`)).toThrow(/local development/i);
  });

  it("throws for invalid references instead of returning them", () => {
    expect(() => deliveryUrl("../secret.webp")).toThrow(/invalid/i);
    expect(() => deliveryUrl("")).toThrow(/required/i);
  });

  it("requires a public domain for R2 keys", () => {
    vi.stubEnv("NEXT_PUBLIC_R2_PUBLIC_DOMAIN", "");
    expect(() => deliveryUrl(KEY)).toThrow(/NEXT_PUBLIC_R2_PUBLIC_DOMAIN/);
  });
});

describe("storage checks", () => {
  it("uses local mode for configuration and rejects unsafe object checks", async () => {
    vi.stubEnv("PANTAKER_IMAGE_MODE", "local");
    expect(isImageStorageConfigured()).toBe(true);
    expect(await imageObjectExists("../secret.webp")).toBe(false);
    expect(await deleteStoredImage("../secret.webp")).toBe(false);
  });

  it("does not treat bare legacy IDs as object keys", async () => {
    expect(await imageObjectExists("legacy_image-id")).toBe(false);
    expect(await deleteStoredImage("legacy_image-id")).toBe(false);
  });
});

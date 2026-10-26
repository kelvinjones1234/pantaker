import { describe, expect, it } from "vitest";
import {
  validateListingImageKeys,
  validateProfileImageKey,
} from "@/features/listings/image-keys";

const USER = "11111111-1111-1111-1111-111111111111";
const OTHER = "22222222-2222-2222-2222-222222222222";
const IMAGE = "33333333-3333-3333-3333-333333333333";
const OWN = `listings/${USER}/${IMAGE}.webp`;
const FOREIGN = `listings/${OTHER}/${IMAGE}.webp`;
const PROFILE = `profiles/${USER}/${IMAGE}.webp`;

describe("validateListingImageKeys", () => {
  it("accepts new keys under the seller's own prefix", () => {
    expect(
      validateListingImageKeys({ keys: [OWN], userId: USER }),
    ).toEqual({ ok: true, keys: [OWN], newKeys: [OWN] });
  });

  it("rejects foreign, private, traversal, and profile keys", () => {
    for (const key of [
      FOREIGN,
      `private/verification/${USER}/doc.webp`,
      `listings/${USER}/../${OTHER}/x.webp`,
      PROFILE,
      "media/old.jpg",
    ]) {
      expect(validateListingImageKeys({ keys: [key], userId: USER })).toMatchObject({
        ok: false,
      });
    }
  });

  it("allows keys already attached to the listing, including legacy values", () => {
    const legacy = "media/legacy-image.webp";
    const result = validateListingImageKeys({
      keys: [legacy, OWN],
      userId: USER,
      existingKeys: [legacy],
    });
    expect(result).toMatchObject({
      ok: true,
      newKeys: [OWN],
    });
  });

  it("rejects duplicate and excessive image arrays", () => {
    expect(
      validateListingImageKeys({ keys: [OWN, OWN], userId: USER }),
    ).toMatchObject({ ok: false });
    expect(
      validateListingImageKeys({
        keys: Array.from(
          { length: 4 },
          (_, index) =>
            `listings/${USER}/0000000${index}-0000-4000-8000-000000000000.webp`,
        ),
        userId: USER,
      }),
    ).toMatchObject({ ok: false });
  });
});

describe("validateProfileImageKey", () => {
  it("accepts a new key under the user's profile prefix", () => {
    expect(validateProfileImageKey({ key: PROFILE, userId: USER })).toEqual({
      ok: true,
      key: PROFILE,
      newKey: PROFILE,
    });
  });

  it("allows retaining the current legacy avatar", () => {
    expect(
      validateProfileImageKey({
        key: "https://imagedelivery.net/hash/id/public",
        userId: USER,
        currentKey: "https://imagedelivery.net/hash/id/public",
      }),
    ).toMatchObject({ ok: true, newKey: null });
  });

  it("rejects new legacy or foreign keys", () => {
    for (const key of [
      "https://imagedelivery.net/hash/id/public",
      "legacy_id",
      FOREIGN,
      `profiles/${OTHER}/${IMAGE}.webp`,
    ]) {
      expect(validateProfileImageKey({ key, userId: USER })).toMatchObject({
        ok: false,
      });
    }
  });

  it("treats empty and null values as removal", () => {
    expect(validateProfileImageKey({ key: "", userId: USER })).toEqual({
      ok: true,
      key: null,
      newKey: null,
    });
    expect(
      validateProfileImageKey({ key: null, userId: USER, currentKey: PROFILE }),
    ).toEqual({ ok: true, key: null, newKey: null });
  });
});

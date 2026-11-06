import { describe, expect, it } from "vitest";
import {
  availableContactChannels,
  hasAnyContactChannel,
  hasContactDetails,
  normalizeHandle,
  phoneDigits,
  phoneHref,
  socialLinks,
  whatsappHref,
  type ContactFields,
} from "@/lib/contact";

const EMPTY: ContactFields = {
  phone: null,
  phone_is_whatsapp: false,
  instagram_handle: null,
  x_handle: null,
  facebook_handle: null,
  tiktok_handle: null,
};

describe("normalizeHandle", () => {
  it("trims and strips leading @ characters", () => {
    expect(normalizeHandle("  @@amina.bello ")).toBe("amina.bello");
  });

  it("treats empty input as null", () => {
    expect(normalizeHandle("")).toBeNull();
    expect(normalizeHandle("   ")).toBeNull();
    expect(normalizeHandle(null)).toBeNull();
  });
});

describe("phone links", () => {
  it("keeps digits and a leading plus for tel links", () => {
    expect(phoneHref("+234 (803) 000-0000")).toBe("tel:+2348030000000");
    expect(phoneHref("0803 000 0000")).toBe("tel:08030000000");
  });

  it("returns null when there are no digits", () => {
    expect(phoneHref("call me")).toBeNull();
    expect(phoneHref(null)).toBeNull();
  });

  it("strips everything except digits for WhatsApp", () => {
    expect(phoneDigits("+234 (803) 000-0000")).toBe("2348030000000");
    expect(whatsappHref("+234 (803) 000-0000")).toBe(
      "https://wa.me/2348030000000",
    );
    expect(whatsappHref("")).toBeNull();
  });
});

describe("socialLinks", () => {
  it("builds canonical URLs for supplied handles only", () => {
    const links = socialLinks({
      ...EMPTY,
      instagram_handle: "amina.bello",
      x_handle: "amina_b",
      tiktok_handle: "amina.bello",
    });

    expect(links).toEqual([
      {
        key: "instagram",
        label: "Instagram",
        handle: "amina.bello",
        href: "https://instagram.com/amina.bello",
      },
      {
        key: "x",
        label: "X",
        handle: "amina_b",
        href: "https://x.com/amina_b",
      },
      {
        key: "tiktok",
        label: "TikTok",
        handle: "amina.bello",
        href: "https://tiktok.com/@amina.bello",
      },
    ]);
  });

  it("uses the Facebook handle when present", () => {
    expect(socialLinks({ ...EMPTY, facebook_handle: "amina.bello" })).toEqual([
      {
        key: "facebook",
        label: "Facebook",
        handle: "amina.bello",
        href: "https://facebook.com/amina.bello",
      },
    ]);
  });
});

describe("hasContactDetails", () => {
  it("is false for an empty profile and true for any contact field", () => {
    expect(hasContactDetails(EMPTY)).toBe(false);
    expect(hasContactDetails({ ...EMPTY, phone: "+2348030000000" })).toBe(true);
    expect(hasContactDetails({ ...EMPTY, tiktok_handle: "amina" })).toBe(true);
  });
});

describe("availableContactChannels", () => {
  it("detects phone, whatsapp, and social platforms correctly", () => {
    expect(availableContactChannels(null)).toEqual({
      has_phone: false,
      has_whatsapp: false,
      socials: [],
    });

    const channels = availableContactChannels({
      ...EMPTY,
      phone: "+2348030000000",
      phone_is_whatsapp: true,
      instagram_handle: "amina.bello",
      x_handle: "amina_b",
    });

    expect(channels).toEqual({
      has_phone: true,
      has_whatsapp: true,
      socials: ["instagram", "x"],
    });
    expect(hasAnyContactChannel(channels)).toBe(true);
    expect(hasAnyContactChannel({ has_phone: false, has_whatsapp: false, socials: [] })).toBe(false);
  });
});

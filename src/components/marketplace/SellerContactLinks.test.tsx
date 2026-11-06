import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SellerContactLinks } from "@/components/marketplace/SellerContactLinks";
import type { ContactFields } from "@/lib/contact";

const MOCK_CONTACT: ContactFields = {
  phone: "+2348030000000",
  phone_is_whatsapp: true,
  instagram_handle: "amina.bello",
  x_handle: "amina_b",
  facebook_handle: null,
  tiktok_handle: null,
};

const EMPTY_CONTACT: ContactFields = {
  phone: null,
  phone_is_whatsapp: false,
  instagram_handle: null,
  x_handle: null,
  facebook_handle: null,
  tiktok_handle: null,
};

describe("SellerContactLinks", () => {
  it("renders nothing when seller has no contact channels", () => {
    const html = renderToStaticMarkup(
      <SellerContactLinks
        contact={EMPTY_CONTACT}
        availableChannels={{
          has_phone: false,
          has_whatsapp: false,
          socials: [],
        }}
        isAuthenticated={false}
      />,
    );
    expect(html).toBe("");
  });

  it("renders locked teaser when unauthenticated and does NOT expose phone or handles", () => {
    const html = renderToStaticMarkup(
      <SellerContactLinks
        contact={{
          ...EMPTY_CONTACT, // phone is redacted
        }}
        availableChannels={{
          has_phone: true,
          has_whatsapp: true,
          socials: ["instagram", "x"],
        }}
        isAuthenticated={false}
        listingId="listing-123"
      />,
    );

    // Assert sensitive information is absent
    expect(html).not.toContain("+2348030000000");
    expect(html).not.toContain("amina.bello");
    expect(html).not.toContain("amina_b");
    expect(html).not.toContain("tel:");
    expect(html).not.toContain("https://wa.me/");

    // Assert teaser card elements
    expect(html).toContain("Direct seller contact");
    expect(html).toContain("Phone call");
    expect(html).toContain("WhatsApp");
    expect(html).toContain("Instagram");
    expect(html).toContain("X");
    expect(html).toContain('href="/login?next=%2Fmarketplace%2Flisting%2Flisting-123"');
    expect(html).toContain("Contact seller");
  });

  it("renders active call, WhatsApp, and social links when authenticated", () => {
    const html = renderToStaticMarkup(
      <SellerContactLinks
        contact={MOCK_CONTACT}
        isAuthenticated={true}
        listingId="listing-123"
      />,
    );

    // Call button
    expect(html).toContain('href="tel:+2348030000000"');
    expect(html).toContain("+2348030000000");

    // WhatsApp button
    expect(html).toContain('href="https://wa.me/2348030000000"');
    expect(html).toContain("Chat on WhatsApp");

    // Social handles
    expect(html).toContain("@amina.bello");
    expect(html).toContain('href="https://instagram.com/amina.bello"');
    expect(html).toContain("@amina_b");
    expect(html).toContain('href="https://x.com/amina_b"');

    // Locked prompt should NOT be present
    expect(html).not.toContain("Contact seller");
  });

  it("renders unlocked contact details for the owner even if not explicitly marked buyer-authenticated", () => {
    const html = renderToStaticMarkup(
      <SellerContactLinks
        contact={MOCK_CONTACT}
        isAuthenticated={false}
        isOwner={true}
        listingId="listing-123"
      />,
    );

    expect(html).toContain('href="tel:+2348030000000"');
    expect(html).toContain("Visible to signed-in buyers");
    expect(html).not.toContain("Contact seller");
  });
});

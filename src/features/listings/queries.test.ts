import { beforeEach, describe, expect, it, vi } from "vitest";

const mockListing = {
  id: "listing-123",
  seller_id: "seller-456",
  title: "Industrial Scrap Metal",
  description: "High quality aluminum profiles",
  condition: "used",
  item_status: "published",
  pricing_type: "fixed",
  price: 25000,
  negotiable: true,
  quantity: 5,
  quantity_unit: "kg",
  city: "Abuja",
  area: "Idu",
  pickup_notes: "Call ahead for loading",
  published_at: new Date("2026-03-01T10:00:00.000Z"),
  created_at: new Date("2026-03-01T10:00:00.000Z"),
  updated_at: new Date("2026-03-01T10:00:00.000Z"),
  category: { name: "Scrap & Metal", slug: "scrap-metal" },
  images: [],
  seller: {
    profile: {
      id: "profile-789",
      display_name: "Amina Scrap Yard",
      username: "aminascrpyard",
      avatar_path: null,
      city: "Abuja",
      area: "Idu",
      bio: "Trusted scrap dealer",
      account_type: "business",
      phone: "+2348030000000",
      phone_is_whatsapp: true,
      instagram_handle: "amina.metal",
      x_handle: "amina_metal",
      facebook_handle: "aminametalabuja",
      tiktok_handle: "aminametal",
      created_at: new Date("2025-01-01T00:00:00.000Z"),
    },
  },
};

vi.mock("@/lib/prisma", () => ({
  isPrismaConfigured: () => true,
  getPrisma: () => ({
    listing: {
      findFirst: vi.fn(async () => mockListing),
    },
  }),
}));

vi.mock("@/lib/image-storage", () => ({
  isImageStorageConfigured: () => false,
  deliveryUrl: (path: string) => path,
}));

import { getListingDetail } from "@/features/listings/queries";

describe("getListingDetail seller contact gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redacts sensitive contact details when viewerUserId is null (unauthenticated)", async () => {
    const detail = await getListingDetail("listing-123", null);

    expect(detail).not.toBeNull();
    expect(detail?.seller).not.toBeNull();

    // Sensitive contact information must be redacted
    expect(detail?.seller?.phone).toBeNull();
    expect(detail?.seller?.phone_is_whatsapp).toBe(false);
    expect(detail?.seller?.instagram_handle).toBeNull();
    expect(detail?.seller?.x_handle).toBeNull();
    expect(detail?.seller?.facebook_handle).toBeNull();
    expect(detail?.seller?.tiktok_handle).toBeNull();

    // Available channels must still indicate capability for teaser display
    expect(detail?.seller?.available_channels).toEqual({
      has_phone: true,
      has_whatsapp: true,
      socials: ["instagram", "x", "facebook", "tiktok"],
    });

    // Public seller details should remain intact
    expect(detail?.seller?.display_name).toBe("Amina Scrap Yard");
    expect(detail?.seller?.username).toBe("aminascrpyard");
  });

  it("redacts sensitive contact details when viewerUserId is omitted", async () => {
    const detail = await getListingDetail("listing-123");

    expect(detail).not.toBeNull();
    expect(detail?.seller?.phone).toBeNull();
    expect(detail?.seller?.phone_is_whatsapp).toBe(false);
    expect(detail?.seller?.instagram_handle).toBeNull();
    expect(detail?.seller?.x_handle).toBeNull();
    expect(detail?.seller?.facebook_handle).toBeNull();
    expect(detail?.seller?.tiktok_handle).toBeNull();
    expect(detail?.seller?.available_channels?.has_phone).toBe(true);
    expect(detail?.seller?.available_channels?.has_whatsapp).toBe(true);
  });

  it("reveals full contact details when viewerUserId is provided (authenticated)", async () => {
    const detail = await getListingDetail("listing-123", "buyer-user-id");

    expect(detail).not.toBeNull();
    expect(detail?.seller).not.toBeNull();

    // Full contact details must be revealed
    expect(detail?.seller?.phone).toBe("+2348030000000");
    expect(detail?.seller?.phone_is_whatsapp).toBe(true);
    expect(detail?.seller?.instagram_handle).toBe("amina.metal");
    expect(detail?.seller?.x_handle).toBe("amina_metal");
    expect(detail?.seller?.facebook_handle).toBe("aminametalabuja");
    expect(detail?.seller?.tiktok_handle).toBe("aminametal");

    // Available channels should also be accurate
    expect(detail?.seller?.available_channels).toEqual({
      has_phone: true,
      has_whatsapp: true,
      socials: ["instagram", "x", "facebook", "tiktok"],
    });
  });
});

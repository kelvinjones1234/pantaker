import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireUserMock,
  revalidateMock,
  checkWriteMock,
  emitMock,
  configured,
  prisma,
  holder,
} = vi.hoisted(() => ({
  requireUserMock: vi.fn(async (_next?: string) => ({
    id: "seller-a",
    email: "a@example.com",
  })),
  revalidateMock: vi.fn(),
  checkWriteMock: vi.fn(async (): Promise<{ ok: boolean; error?: string }> => ({
    ok: true,
  })),
  emitMock: vi.fn(async (..._args: unknown[]) => undefined),
  configured: { value: true },
  prisma: {
    listing: { findUnique: vi.fn(async () => null) },
    inquiry: { findUnique: vi.fn(async () => null) },
    sale: {
      findFirst: vi.fn(async () => null),
      findUnique: vi.fn(async () => null),
    },
  } as any,
  holder: {
    saleInserts: [] as Array<Record<string, unknown>>,
    saleUpdates: [] as Array<{
      where: Record<string, unknown>;
      data: Record<string, unknown>;
    }>,
    updateCount: 1,
    createError: null as unknown,
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: revalidateMock }));
vi.mock("@/features/auth/authorization", () => ({
  requireUserForAction: (next?: string) => requireUserMock(next),
}));
vi.mock("@/features/accounts/access", () => ({
  checkAccountCanWrite: () => checkWriteMock(),
}));
vi.mock("@/features/notifications/emit", () => ({
  emitSaleStatusNotification: (...args: unknown[]) => emitMock(...args),
}));
vi.mock("@/lib/prisma", () => ({
  getPrisma: () => prisma,
  isPrismaConfigured: () => configured.value,
}));
vi.mock("@/lib/db/context", () => ({
  withUserContext: async (_user: unknown, work: (tx: unknown) => unknown) =>
    work({
      sale: {
        create: async (args: { data: Record<string, unknown> }) => {
          holder.saleInserts.push(args.data);
          if (holder.createError) throw holder.createError;
          return { id: "sale-1" };
        },
        updateMany: async (args: {
          where: Record<string, unknown>;
          data: Record<string, unknown>;
        }) => {
          holder.saleUpdates.push(args);
          return { count: holder.updateCount };
        },
      },
    }),
}));

import {
  createSaleAction,
  updateSaleDetailsAction,
  updateSaleStatusAction,
  type SaleActionResult,
} from "@/features/sales/actions";

function errorOf(result: SaleActionResult): string | undefined {
  return result.ok ? undefined : result.error;
}

function errorsOf(
  result: SaleActionResult,
): Record<string, string[] | undefined> {
  return result.ok ? {} : (result.errors ?? {});
}

function formData(entries: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

const LISTING_ID = "3f1c2a4e-5b6d-4e7f-8a90-1b2c3d4e5f60";
const ENQUIRY_ID = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";
const SALE_ID = "9c8b7a65-4d3e-4f2a-8b1c-0d9e8f7a6b5c";

beforeEach(() => {
  configured.value = true;
  requireUserMock.mockResolvedValue({ id: "seller-a", email: "a@example.com" });
  checkWriteMock.mockResolvedValue({ ok: true });
  prisma.listing.findUnique.mockResolvedValue({
    seller_id: "seller-a",
    item_status: "published",
  });
  prisma.inquiry.findUnique.mockResolvedValue(null);
  prisma.sale.findFirst.mockResolvedValue(null);
  prisma.sale.findUnique.mockResolvedValue({
    seller_id: "seller-a",
    status: "reserved",
    collection_notes: null,
  });
  holder.saleInserts = [];
  holder.saleUpdates = [];
  holder.updateCount = 1;
  holder.createError = null;
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("createSaleAction", () => {
  it("denies a restricted account before writing anything", async () => {
    checkWriteMock.mockResolvedValueOnce({
      ok: false,
      error: "Your account is restricted.",
    });
    const res = await createSaleAction(formData({ listing_id: LISTING_ID }));
    expect(res.ok).toBe(false);
    expect(errorOf(res)).toMatch(/restricted/i);
    expect(prisma.listing.findUnique).not.toHaveBeenCalled();
  });

  it("redirects an anonymous caller before writing anything", async () => {
    requireUserMock.mockImplementationOnce(async () => {
      throw new Error("NEXT_REDIRECT:/login");
    });
    await expect(
      createSaleAction(formData({ listing_id: LISTING_ID })),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(prisma.listing.findUnique).not.toHaveBeenCalled();
  });

  it("refuses a listing the seller does not own", async () => {
    prisma.listing.findUnique.mockResolvedValue({
      seller_id: "someone-else",
      item_status: "published",
    });
    const res = await createSaleAction(formData({ listing_id: LISTING_ID }));
    expect(res.ok).toBe(false);
    expect(errorOf(res)).toMatch(/access/i);
    expect(holder.saleInserts).toHaveLength(0);
  });

  it("refuses a listing that is archived", async () => {
    prisma.listing.findUnique.mockResolvedValue({
      seller_id: "seller-a",
      item_status: "archived",
    });
    const res = await createSaleAction(formData({ listing_id: LISTING_ID }));
    expect(res.ok).toBe(false);
    expect(errorOf(res)).toMatch(/archived/i);
    expect(holder.saleInserts).toHaveLength(0);
  });

  it("refuses a second active sale for the same listing", async () => {
    prisma.sale.findFirst.mockResolvedValue({ id: SALE_ID });
    const res = await createSaleAction(formData({ listing_id: LISTING_ID }));
    expect(res.ok).toBe(false);
    expect(errorOf(res)).toMatch(/in progress/i);
    expect(holder.saleInserts).toHaveLength(0);
  });

  it("records a sale for the session seller, deriving status and owner server-side", async () => {
    const res = await createSaleAction(
      formData({
        listing_id: LISTING_ID,
        buyer_label: "Ada",
        agreed_price: "45000",
      }),
    );
    expect(res).toEqual({ ok: true, id: "sale-1" });
    expect(revalidateMock).toHaveBeenCalledWith("/seller/sales");
    expect(holder.saleInserts[0]).toMatchObject({
      listing_id: LISTING_ID,
      seller_id: "seller-a",
      status: "awaiting_confirmation",
      agreed_price: 45000,
    });
    expect(emitMock).toHaveBeenCalledWith(expect.any(Object), "sale-1");
  });

  it("derives the buyer from a linked enquiry instead of trusting the client", async () => {
    prisma.inquiry.findUnique.mockResolvedValue({
      buyer_id: "buyer-7",
      listing_id: LISTING_ID,
      seller_id: "seller-a",
    });
    const res = await createSaleAction(
      formData({ listing_id: LISTING_ID, source_inquiry_id: ENQUIRY_ID }),
    );
    expect(res.ok).toBe(true);
    expect(holder.saleInserts[0]?.buyer_id).toBe("buyer-7");
  });

  it("rejects an enquiry that belongs to another listing", async () => {
    prisma.inquiry.findUnique.mockResolvedValue({
      buyer_id: "buyer-1",
      listing_id: "00000000-0000-4000-8000-000000000000",
      seller_id: "seller-a",
    });
    const res = await createSaleAction(
      formData({ listing_id: LISTING_ID, source_inquiry_id: ENQUIRY_ID }),
    );
    expect(res.ok).toBe(false);
    expect(errorOf(res)).toMatch(/enquiry/i);
    expect(holder.saleInserts).toHaveLength(0);
  });

  it("rejects malformed input before any query runs", async () => {
    const res = await createSaleAction(formData({ listing_id: "not-a-uuid" }));
    expect(res.ok).toBe(false);
    expect(prisma.listing.findUnique).not.toHaveBeenCalled();
  });

  it("maps a unique violation on insert to a friendly message", async () => {
    holder.createError = { code: "P2002" };
    const res = await createSaleAction(formData({ listing_id: LISTING_ID }));
    expect(res.ok).toBe(false);
    expect(errorOf(res)).toMatch(/in progress/i);
  });
});

describe("updateSaleStatusAction", () => {
  it("rejects a status the lifecycle does not allow from the current one", async () => {
    prisma.sale.findUnique.mockResolvedValue({
      seller_id: "seller-a",
      status: "awaiting_confirmation",
      collection_notes: null,
    });
    const res = await updateSaleStatusAction(
      SALE_ID,
      formData({ status: "completed" }),
    );
    expect(res.ok).toBe(false);
    expect(errorOf(res)).toMatch(/not allowed/i);
    expect(holder.saleUpdates).toHaveLength(0);
  });

  it("rejects a tampered status value such as 'paid'", async () => {
    const res = await updateSaleStatusAction(
      SALE_ID,
      formData({ status: "paid" }),
    );
    expect(res.ok).toBe(false);
    expect(prisma.sale.findUnique).not.toHaveBeenCalled();
  });

  it("requires collection notes before arranging collection", async () => {
    prisma.sale.findUnique.mockResolvedValue({
      seller_id: "seller-a",
      status: "reserved",
      collection_notes: null,
    });
    const res = await updateSaleStatusAction(
      SALE_ID,
      formData({ status: "collection_arranged" }),
    );
    expect(res.ok).toBe(false);
    expect(errorsOf(res).collection_notes?.[0]).toMatch(/collect/i);
    expect(holder.saleUpdates).toHaveLength(0);
  });

  it("moves a reserved sale to collection arranged and writes the notes", async () => {
    prisma.sale.findUnique.mockResolvedValue({
      seller_id: "seller-a",
      status: "reserved",
      collection_notes: null,
    });
    const res = await updateSaleStatusAction(
      SALE_ID,
      formData({
        status: "collection_arranged",
        collection_notes: "Wuse 2, Saturday 2pm",
      }),
    );
    expect(res.ok).toBe(true);
    expect(holder.saleUpdates[0]?.data).toMatchObject({
      status: "collection_arranged",
      collection_notes: "Wuse 2, Saturday 2pm",
    });
    expect(emitMock).toHaveBeenCalledWith(expect.any(Object), SALE_ID);
  });

  it("does not notify when the status change itself was rejected", async () => {
    holder.updateCount = 0;
    prisma.sale.findUnique.mockResolvedValue({
      seller_id: "seller-a",
      status: "reserved",
      collection_notes: "Sat",
    });
    const res = await updateSaleStatusAction(
      SALE_ID,
      formData({ status: "completed" }),
    );
    expect(res.ok).toBe(false);
    expect(emitMock).not.toHaveBeenCalled();
  });

  it("stamps completed_at only when completing", async () => {
    prisma.sale.findUnique.mockResolvedValue({
      seller_id: "seller-a",
      status: "collection_arranged",
      collection_notes: "Sat",
    });
    const res = await updateSaleStatusAction(
      SALE_ID,
      formData({ status: "completed" }),
    );
    expect(res.ok).toBe(true);
    expect(holder.saleUpdates[0]?.data.completed_at).toBeInstanceOf(Date);
  });

  it("refuses a sale owned by another seller", async () => {
    prisma.sale.findUnique.mockResolvedValue({
      seller_id: "someone-else",
      status: "reserved",
      collection_notes: null,
    });
    const res = await updateSaleStatusAction(
      SALE_ID,
      formData({ status: "completed" }),
    );
    expect(res.ok).toBe(false);
    expect(holder.saleUpdates).toHaveLength(0);
  });
});

describe("updateSaleDetailsAction", () => {
  it("refuses to edit a sale owned by another seller", async () => {
    prisma.sale.findUnique.mockResolvedValue({ seller_id: "someone-else" });
    const res = await updateSaleDetailsAction(
      SALE_ID,
      formData({ agreed_price: "10" }),
    );
    expect(res.ok).toBe(false);
    expect(holder.saleUpdates).toHaveLength(0);
  });

  it("stores an empty agreed price as null rather than zero", async () => {
    prisma.sale.findUnique.mockResolvedValue({ seller_id: "seller-a" });
    const res = await updateSaleDetailsAction(
      SALE_ID,
      formData({ agreed_price: "" }),
    );
    expect(res.ok).toBe(true);
    expect(holder.saleUpdates[0]?.data.agreed_price).toBeNull();
  });
});

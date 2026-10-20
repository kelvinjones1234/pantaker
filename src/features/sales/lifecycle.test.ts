import { describe, expect, it } from "vitest";
import {
  ACTIVE_SALE_STATUSES,
  canOpenSaleForListing,
  canSaleTransition,
  findSaleTransition,
  isActiveSaleStatus,
  isTerminalSaleStatus,
  transitionsFromSale,
} from "@/features/sales/lifecycle";

describe("sale status transitions", () => {
  it("moves an unconfirmed sale only to reserved or cancelled", () => {
    expect(transitionsFromSale("awaiting_confirmation").map((t) => t.to)).toEqual([
      "reserved",
      "cancelled",
    ]);
    expect(canSaleTransition("awaiting_confirmation", "collection_arranged")).toBe(false);
    expect(canSaleTransition("awaiting_confirmation", "completed")).toBe(false);
  });

  it("lets a reserved sale be collected, completed, or cancelled", () => {
    expect(canSaleTransition("reserved", "collection_arranged")).toBe(true);
    expect(canSaleTransition("reserved", "completed")).toBe(true);
    expect(canSaleTransition("reserved", "cancelled")).toBe(true);
  });

  it("requires collection notes to arrange collection", () => {
    const transition = findSaleTransition("reserved", "collection_arranged");
    expect(transition?.requiresCollectionNotes).toBe(true);
  });

  it("treats completed and cancelled as terminal", () => {
    expect(transitionsFromSale("completed")).toEqual([]);
    expect(transitionsFromSale("cancelled")).toEqual([]);
    expect(canSaleTransition("completed", "reserved")).toBe(false);
    expect(canSaleTransition("cancelled", "awaiting_confirmation")).toBe(false);
    expect(isTerminalSaleStatus("completed")).toBe(true);
    expect(isTerminalSaleStatus("cancelled")).toBe(true);
  });

  it("never exposes a paid status or transition", () => {
    for (const transitions of Object.values(
      { a: transitionsFromSale("awaiting_confirmation"), b: transitionsFromSale("reserved") },
    )) {
      expect(transitions.some((t) => t.to.includes("paid"))).toBe(false);
    }
  });
});

describe("active sale helpers", () => {
  it("counts only in-progress statuses as active", () => {
    expect(ACTIVE_SALE_STATUSES).toEqual(["awaiting_confirmation", "reserved", "collection_arranged"]);
    expect(isActiveSaleStatus("reserved")).toBe(true);
    expect(isActiveSaleStatus("completed")).toBe(false);
    expect(isActiveSaleStatus("cancelled")).toBe(false);
  });

  it("blocks opening a sale for an archived listing", () => {
    expect(canOpenSaleForListing("published")).toBe(true);
    expect(canOpenSaleForListing("sold")).toBe(true);
    expect(canOpenSaleForListing("archived")).toBe(false);
  });
});

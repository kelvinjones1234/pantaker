import { describe, expect, it } from "vitest";
import {
  parseListingModerationInput,
  parseReportModerationInput,
} from "@/features/admin/moderation-rules";

const ID = "9c8b7a65-4d3e-4f2a-8b1c-0d9e8f7a6b5c";

function formData(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

describe("parseListingModerationInput", () => {
  it("accepts a rejection with a reason", () => {
    expect(
      parseListingModerationInput(
        formData({ listing_id: ID, status: "rejected", reason: "Photo is misleading" }),
      ),
    ).toEqual({
      ok: true,
      value: { listingId: ID, status: "rejected", reason: "Photo is misleading" },
    });
  });

  it("requires a reason when rejecting", () => {
    const result = parseListingModerationInput(
      formData({ listing_id: ID, status: "rejected", reason: "no" }),
    );
    expect(result.ok).toBe(false);
  });

  it("rejects moderation statuses outside the review workflow", () => {
    const result = parseListingModerationInput(
      formData({ listing_id: ID, status: "sold" }),
    );
    expect(result.ok).toBe(false);
  });

  it("rejects a malformed listing id", () => {
    expect(
      parseListingModerationInput(formData({ listing_id: "x", status: "published" })).ok,
    ).toBe(false);
  });
});

describe("parseReportModerationInput", () => {
  it("requires a note when closing a report", () => {
    expect(
      parseReportModerationInput(formData({ report_id: ID, status: "resolved" })).ok,
    ).toBe(false);
  });

  it("accepts a reviewed report with a note", () => {
    expect(
      parseReportModerationInput(
        formData({ report_id: ID, status: "resolved", note: "Listing removed" }),
      ),
    ).toEqual({
      ok: true,
      value: { reportId: ID, status: "resolved", note: "Listing removed" },
    });
  });

  it("does not require a note to start reviewing", () => {
    expect(
      parseReportModerationInput(formData({ report_id: ID, status: "reviewing" })).ok,
    ).toBe(true);
  });
});

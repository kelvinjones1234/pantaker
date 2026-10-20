import type { ItemStatus } from "@/types/marketplace";

export const MODERATION_LISTING_STATUSES = [
  "pending_review",
  "published",
  "rejected",
] as const satisfies readonly ItemStatus[];

export type ModerationListingStatus = (typeof MODERATION_LISTING_STATUSES)[number];

export const REPORT_STATUSES = ["open", "reviewing", "resolved", "dismissed"] as const;

export type AdminReportStatus = (typeof REPORT_STATUSES)[number];

export const REPORT_STATUS_LABELS: Record<AdminReportStatus, string> = {
  open: "Open",
  reviewing: "Reviewing",
  resolved: "Resolved",
  dismissed: "Dismissed",
};

export const LISTING_STATUS_LABELS: Record<ItemStatus, string> = {
  draft: "Draft",
  pending_review: "Pending review",
  published: "Published",
  rejected: "Rejected",
  sold: "Sold",
  archived: "Archived",
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ModerationInputResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export function parseListingModerationInput(
  formData: FormData,
): ModerationInputResult<{
  listingId: string;
  status: ModerationListingStatus;
  reason: string | null;
}> {
  const listingId = String(formData.get("listing_id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const rawReason = String(formData.get("reason") ?? "").trim();

  if (!UUID_PATTERN.test(listingId)) {
    return { ok: false, error: "That listing could not be identified." };
  }
  if (!(MODERATION_LISTING_STATUSES as readonly string[]).includes(status)) {
    return { ok: false, error: "Choose a valid moderation decision." };
  }
  if (status === "rejected" && rawReason.length < 5) {
    return { ok: false, error: "Give a rejection reason of at least 5 characters." };
  }
  if (rawReason.length > 500) {
    return { ok: false, error: "Keep the moderation note under 500 characters." };
  }

  return {
    ok: true,
    value: {
      listingId,
      status: status as ModerationListingStatus,
      reason: rawReason || null,
    },
  };
}

export function parseReportModerationInput(
  formData: FormData,
): ModerationInputResult<{ reportId: string; status: AdminReportStatus; note: string | null }> {
  const reportId = String(formData.get("report_id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const rawNote = String(formData.get("note") ?? "").trim();

  if (!UUID_PATTERN.test(reportId)) {
    return { ok: false, error: "That report could not be identified." };
  }
  if (!(REPORT_STATUSES as readonly string[]).includes(status)) {
    return { ok: false, error: "Choose a valid report status." };
  }
  if ((status === "resolved" || status === "dismissed") && rawNote.length < 5) {
    return { ok: false, error: "Add a short note explaining the decision." };
  }
  if (rawNote.length > 1000) {
    return { ok: false, error: "Keep the report note under 1,000 characters." };
  }

  return {
    ok: true,
    value: { reportId, status: status as AdminReportStatus, note: rawNote || null },
  };
}

"use server";

import { revalidatePath } from "next/cache";
import { requireAdminPermissionForAction } from "@/features/admin/authorization";
import {
  parseListingModerationInput,
  parseReportModerationInput,
} from "@/features/admin/moderation-rules";
import { withUserContext } from "@/lib/db/context";

export type ModerationActionResult =
  { ok: true; message?: string } | { ok: false; error?: string };

export async function setListingStatusAction(
  formData: FormData,
): Promise<ModerationActionResult> {
  const actor = await requireAdminPermissionForAction("listings.review");

  const parsed = parseListingModerationInput(formData);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  try {
    await withUserContext(
      actor,
      (tx) =>
        tx.$executeRaw`select public.admin_set_listing_status(${parsed.value.listingId}::uuid, ${parsed.value.status}, ${parsed.value.reason})`,
    );
  } catch {
    return {
      ok: false,
      error: "Could not update that listing. Please try again.",
    };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/listings");
  revalidatePath("/marketplace");
  revalidatePath("/seller/listings");

  if (parsed.value.status === "published") {
    return { ok: true, message: "Listing published." };
  }
  if (parsed.value.status === "rejected") {
    return { ok: true, message: "Listing rejected." };
  }
  return { ok: true, message: "Listing moved back to review." };
}

export async function setReportStatusAction(
  formData: FormData,
): Promise<ModerationActionResult> {
  const actor = await requireAdminPermissionForAction("reports.manage");

  const parsed = parseReportModerationInput(formData);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  try {
    await withUserContext(
      actor,
      (tx) =>
        tx.$executeRaw`select public.admin_set_report_status(${parsed.value.reportId}::uuid, ${parsed.value.status}, ${parsed.value.note})`,
    );
  } catch {
    return {
      ok: false,
      error: "Could not update that report. Please try again.",
    };
  }

  revalidatePath("/admin/reports");
  return { ok: true, message: "Report updated." };
}

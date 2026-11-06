"use server";

import { revalidatePath } from "next/cache";
import { requireAdminPermissionForAction } from "@/features/admin/authorization";
import { isUuid } from "@/lib/storage/object-keys";
import { getPrisma } from "@/lib/prisma";
import { withUserContext } from "@/lib/db/context";
import {
  attemptRecoveryForRefund,
  refundOrder,
  releaseOrder,
} from "@/features/orders/service";

export type AdminOrderActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

function messageFor(error: unknown): string {
  return error instanceof Error ? error.message : "Could not complete that action.";
}

export async function adminRefundOrderAction(
  orderId: string,
  formData: FormData,
): Promise<AdminOrderActionResult> {
  const admin = await requireAdminPermissionForAction("payments.manage");
  if (!isUuid(orderId)) return { ok: false, error: "That order is invalid." };
  const reason = String(formData.get("reason") ?? "").trim();
  if (reason.length < 5) {
    return { ok: false, error: "Add a short reason for the refund." };
  }
  if (reason.length > 300) {
    return { ok: false, error: "Keep the reason under 300 characters." };
  }

  try {
    await refundOrder(admin, orderId, reason);
    await attemptRecoveryForRefund(orderId).catch(() => undefined);
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId}`);
    return {
      ok: true,
      message: "Refund submitted to Bachs. It completes when Bachs confirms.",
    };
  } catch (error) {
    return { ok: false, error: messageFor(error) };
  }
}

export async function adminResolveOrderIssueAction(
  orderId: string,
  formData: FormData,
): Promise<AdminOrderActionResult> {
  const admin = await requireAdminPermissionForAction("payments.manage");
  if (!isUuid(orderId)) return { ok: false, error: "That order is invalid." };
  const resolution = String(formData.get("resolution") ?? "");

  if (resolution === "refund") {
    return adminRefundOrderAction(orderId, formData);
  }
  if (resolution === "release") {
    try {
      const released = await releaseOrder(orderId, { force: true });
      revalidatePath("/admin/orders");
      revalidatePath(`/admin/orders/${orderId}`);
      if (!released) {
        const row = await getPrisma().order.findUnique({
          where: { id: orderId },
          select: { last_release_error: true, status: true },
        });
        if (row?.last_release_error?.startsWith("Transfer created")) {
          return {
            ok: true,
            message: "Transfer submitted. Bachs is settling it.",
          };
        }
        return {
          ok: false,
          error:
            row?.last_release_error ??
            "Release did not complete. Check the seller's Bachs capability or the order status.",
        };
      }
      return { ok: true, message: "Seller transfer created." };
    } catch (error) {
      return { ok: false, error: messageFor(error) };
    }
  }
  if (resolution === "resume") {
    try {
      const order = await getPrisma().order.findUnique({
        where: { id: orderId },
        select: { id: true, handover_at: true, ready_at: true },
      });
      if (!order) return { ok: false, error: "Order not found." };
      const full = await getPrisma().order.findUnique({
        where: { id: orderId },
        select: { listing_id: true },
      });
      const otherActive = full?.listing_id
        ? await getPrisma().order.findFirst({
            where: {
              listing_id: full.listing_id,
              id: { not: orderId },
              status: {
                in: [
                  "pending_payment",
                  "held",
                  "ready_for_handover",
                  "handed_over",
                  "release_blocked",
                  "disputed",
                  "refund_pending",
                ],
              },
            },
            select: { id: true },
          })
        : null;
      if (otherActive) {
        return {
          ok: false,
          error:
            "Another order is still active for this listing. Refund this one instead.",
        };
      }
      await withUserContext(admin, (tx) =>
        tx.order.update({
          where: { id: orderId },
          data: {
            status: order.handover_at
              ? "handed_over"
              : order.ready_at
                ? "ready_for_handover"
                : "held",
            updated_at: new Date(),
          },
        }),
      );
      revalidatePath("/admin/orders");
      revalidatePath(`/admin/orders/${orderId}`);
      return { ok: true, message: "Order resumed." };
    } catch (error) {
      return { ok: false, error: messageFor(error) };
    }
  }
  return { ok: false, error: "Choose a valid resolution." };
}

export async function adminForceReleaseAction(
  orderId: string,
): Promise<AdminOrderActionResult> {
  await requireAdminPermissionForAction("payments.manage");
  if (!isUuid(orderId)) return { ok: false, error: "That order is invalid." };
  try {
    const released = await releaseOrder(orderId, { force: true });
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId}`);
    if (!released) {
      const row = await getPrisma().order.findUnique({
        where: { id: orderId },
        select: { last_release_error: true },
      });
      if (row?.last_release_error?.startsWith("Transfer created")) {
        return { ok: true, message: "Transfer submitted. Bachs is settling it." };
      }
      return {
        ok: false,
        error:
          row?.last_release_error ??
          "Release did not complete. The order may need a verified handover first.",
      };
    }
    return { ok: true, message: "Seller transfer created." };
  } catch (error) {
    return { ok: false, error: messageFor(error) };
  }
}

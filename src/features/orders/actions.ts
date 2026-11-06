"use server";

import { revalidatePath } from "next/cache";
import { requireUserForAction } from "@/features/auth/authorization";
import { checkAccountCanWrite } from "@/features/accounts/access";
import { isPrismaConfigured } from "@/lib/prisma";
import { isUuid } from "@/lib/storage/object-keys";
import {
  buyerConfirmReceipt,
  confirmHandover,
  markOrderReady,
  raiseOrderIssue,
  startCheckout,
} from "@/features/orders/service";

export type OrderActionResult =
  | { ok: true; message?: string; checkoutUrl?: string }
  | { ok: false; error: string };

export async function startOrderCheckoutAction(
  listingId: string,
): Promise<OrderActionResult> {
  const user = await requireUserForAction(`/checkout/${listingId}`);
  if (!isPrismaConfigured()) {
    return { ok: false, error: "Online payments are not configured yet." };
  }
  if (!isUuid(listingId)) {
    return { ok: false, error: "That listing is invalid." };
  }
  const access = await checkAccountCanWrite();
  if (!access.ok) return { ok: false, error: access.error };

  try {
    const checkout = await startCheckout(user, listingId);
    return { ok: true, checkoutUrl: checkout.checkoutUrl };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not start the checkout. Please try again.",
    };
  }
}

export async function markOrderReadyAction(
  orderId: string,
): Promise<OrderActionResult> {
  const user = await requireUserForAction(`/seller/orders/${orderId}`);
  if (!isUuid(orderId)) return { ok: false, error: "That order is invalid." };
  const access = await checkAccountCanWrite();
  if (!access.ok) return { ok: false, error: access.error };

  try {
    await markOrderReady(user, orderId);
    revalidatePath(`/seller/orders/${orderId}`);
    revalidatePath("/seller/orders");
    return { ok: true, message: "Marked ready for handover." };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not update the order.",
    };
  }
}

export async function confirmHandoverAction(
  orderId: string,
  formData: FormData,
): Promise<OrderActionResult> {
  const user = await requireUserForAction(`/seller/orders/${orderId}`);
  if (!isUuid(orderId)) return { ok: false, error: "That order is invalid." };
  const access = await checkAccountCanWrite();
  if (!access.ok) return { ok: false, error: access.error };

  const code = String(formData.get("pickup_code") ?? "").trim();
  if (!/^\d{6}$/.test(code)) {
    return { ok: false, error: "Enter the six-digit pickup code from the buyer." };
  }

  try {
    await confirmHandover(user, orderId, code);
    revalidatePath(`/seller/orders/${orderId}`);
    revalidatePath("/seller/orders");
    return {
      ok: true,
      message: "Handover confirmed. The seller payout is scheduled.",
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not confirm handover.",
    };
  }
}

export async function buyerConfirmReceiptAction(
  orderId: string,
): Promise<OrderActionResult> {
  const user = await requireUserForAction(`/orders/${orderId}`);
  if (!isUuid(orderId)) return { ok: false, error: "That order is invalid." };

  try {
    await buyerConfirmReceipt(user, orderId);
    revalidatePath(`/orders/${orderId}`);
    revalidatePath("/orders");
    return { ok: true, message: "Receipt confirmed. The seller will be paid." };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not confirm receipt.",
    };
  }
}

export async function raiseOrderIssueAction(
  orderId: string,
  formData: FormData,
): Promise<OrderActionResult> {
  const user = await requireUserForAction(`/orders/${orderId}`);
  if (!isUuid(orderId)) return { ok: false, error: "That order is invalid." };

  const reason = String(formData.get("reason") ?? "").trim();
  if (reason.length < 10) {
    return {
      ok: false,
      error: "Describe the problem in at least 10 characters so Pantaker can review it.",
    };
  }
  if (reason.length > 1000) {
    return { ok: false, error: "Keep the description under 1,000 characters." };
  }

  try {
    await raiseOrderIssue(user, orderId, reason);
    revalidatePath(`/orders/${orderId}`);
    return {
      ok: true,
      message: "Pantaker will review this before any seller payout.",
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not pause this order.",
    };
  }
}

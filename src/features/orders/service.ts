import { randomBytes, randomUUID } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/prisma";
import { withServiceContext, withUserContext } from "@/lib/db/context";
import type { User } from "@/generated/prisma/client";
import { getBachs } from "@/lib/bachs/config";
import {
  BachsRestError,
  createRefund,
  createTransfer,
  getTransfer,
  type BachsTransfer,
} from "@/lib/bachs/client";
import {
  amountToKobo,
  commissionFor,
  hashPickupCode,
  koboToAmount,
  pickupCodeFor,
  releaseDueFrom,
  sellerShareFor,
  verifyPickupCode,
} from "@/lib/bachs/money";
import { publicSiteUrl } from "@/lib/bachs/config";
import { ACTIVE_SALE_STATUSES } from "@/features/sales/lifecycle";
import {
  getSellerPaymentAccount,
  sellerCanReceivePayments,
} from "@/features/payments/seller-accounts";
import { ACTIVE_ORDER_STATUSES } from "@/features/orders/lifecycle";
import {
  isDisputeEventStale,
  refundToRetry,
  transferStatusFromEvent,
} from "@/features/orders/payment-rules";
import {
  emitOrderNotifications,
  type OrderNotificationEvent,
} from "@/features/notifications/emit";

/** Stop automatic seller-transfer retries after this many failed attempts. */
export const MAX_RELEASE_ATTEMPTS = 5;

const RELEASE_RETRY_MS = 30 * 60 * 1000;
const RELEASE_CAPABILITY_RETRY_MS = 60 * 60 * 1000;
const TRANSFER_RECONCILE_AFTER_MS = 5 * 60 * 1000;
const RECOVERY_RETRY_AFTER_MS = 60 * 60 * 1000;

function nextReleaseAttempt(attempts: number): Date {
  const minutes = Math.min(2 ** Math.max(attempts - 1, 0), 60);
  return new Date(Date.now() + minutes * 60 * 1000);
}

export class OrderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrderError";
  }
}

export class OrderNotRetryableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrderNotRetryableError";
  }
}

function orderNumber(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `PTK-${date}-${randomBytes(4).toString("hex").toUpperCase()}`;
}

function paidStatusAfterRefundFailure(order: {
  released_at: Date | null;
  handover_at: Date | null;
  ready_at: Date | null;
}): string {
  if (order.released_at) return "released";
  if (order.handover_at) return "handed_over";
  if (order.ready_at) return "ready_for_handover";
  return "held";
}

async function addEvent(
  tx: Prisma.TransactionClient,
  orderId: string,
  type: string,
  message: string | null,
  metadata?: Prisma.InputJsonValue,
) {
  await tx.orderEvent.create({
    data: { order_id: orderId, type, message, metadata },
  });
}

type NotifiableOrder = {
  id: string;
  buyer_id: string | null;
  seller_id: string | null;
};

/**
 * Send the buyer and/or seller an in-app order update. Copy is supplied by the
 * caller because only it knows the transition that just happened; the recipient
 * is always derived from the order, never from a request.
 */
async function notifyOrderParties(
  tx: Parameters<typeof emitOrderNotifications>[0],
  order: NotifiableOrder,
  event: OrderNotificationEvent,
  copy: {
    buyer?: { title: string; body?: string };
    seller?: { title: string; body?: string };
    dedupeSuffix?: string;
  },
): Promise<void> {
  const recipients = [];
  if (order.buyer_id && copy.buyer) {
    recipients.push({
      userId: order.buyer_id,
      title: copy.buyer.title,
      body: copy.buyer.body,
      href: `/orders/${order.id}`,
    });
  }
  if (order.seller_id && copy.seller) {
    recipients.push({
      userId: order.seller_id,
      title: copy.seller.title,
      body: copy.seller.body,
      href: `/seller/orders/${order.id}`,
    });
  }
  await emitOrderNotifications(tx, {
    orderId: order.id,
    event,
    recipients,
    dedupeSuffix: copy.dedupeSuffix,
  });
}

export interface CheckoutStart {
  orderId: string;
  checkoutUrl: string;
}

/**
 * Create (or resume) a hosted Bachs checkout for one fixed-price listing.
 * Listing locking, manual-sale cross-checking and order creation all happen in
 * one transaction, so two buyers cannot both open a checkout for one item.
 */
export async function startCheckout(
  user: Pick<User, "id" | "email" | "name" | "admin_role">,
  listingId: string,
): Promise<CheckoutStart> {
  const prisma = getPrisma();
  const created = await withUserContext(user, async (tx) => {
    await tx.$executeRaw`select pg_advisory_xact_lock(hashtext(${listingId}))`;

    const listing = await tx.listing.findFirst({
      where: { id: listingId, item_status: "published" },
      select: {
        id: true,
        seller_id: true,
        title: true,
        pricing_type: true,
        price: true,
        seller: {
          select: {
            email: true,
            name: true,
            profile: { select: { display_name: true, username: true } },
          },
        },
      },
    });
    if (!listing) throw new OrderError("This listing is no longer available.");
    if (listing.seller_id === user.id) {
      throw new OrderError("You cannot buy your own listing.");
    }
    if (listing.pricing_type !== "fixed" || listing.price == null) {
      throw new OrderError(
        "This listing is not available for online payment. Message the seller instead.",
      );
    }

    const itemKobo = Math.round(listing.price * 100);
    if (!Number.isSafeInteger(itemKobo) || itemKobo <= 0) {
      throw new OrderError("This listing does not have a payable price.");
    }

    const manualSale = await tx.sale.findFirst({
      where: {
        listing_id: listingId,
        status: { in: [...ACTIVE_SALE_STATUSES] },
      },
      select: { id: true },
    });
    if (manualSale) {
      throw new OrderError(
        "This item already has a sale in progress and cannot be bought online.",
      );
    }

    const activeOrders = await tx.order.findMany({
      where: {
        listing_id: listingId,
        status: { in: [...ACTIVE_ORDER_STATUSES] },
      },
      select: { id: true, buyer_id: true, status: true, expires_at: true },
    });

    const own = activeOrders.find((order) => order.buyer_id === user.id);
    const another = activeOrders.find((order) => order.buyer_id !== user.id);
    if (another) {
      throw new OrderError("Someone else is already buying this item.");
    }

    if (own) {
      const expired =
        own.status === "pending_payment" &&
        own.expires_at != null &&
        own.expires_at.getTime() < Date.now();
      if (expired) {
        await tx.order.update({
          where: { id: own.id },
          data: {
            status: "expired",
            updated_at: new Date(),
            payment: { update: { status: "expired", updated_at: new Date() } },
          },
        });
      } else {
        const existing = await tx.order.findUnique({
          where: { id: own.id },
          include: { payment: true },
        });
        if (existing?.payment?.checkout_url) {
          return {
            orderId: existing.id,
            checkoutUrl: existing.payment.checkout_url,
            paymentId: existing.payment.id,
          };
        }
        if (existing?.payment) {
          return {
            orderId: existing.id,
            checkoutUrl: null,
            paymentId: existing.payment.id,
          };
        }
      }
    }

    const sellerAccount = await tx.sellerPaymentAccount.findUnique({
      where: { user_id: listing.seller_id },
      select: { transfers_status: true },
    });
    if (!sellerCanReceivePayments(sellerAccount ?? null)) {
      throw new OrderError(
        "This seller is not ready to receive online payments yet. Message them instead.",
      );
    }

    const id = randomUUID();
    const reference = orderNumber();
    const commission = commissionFor(itemKobo);
    const sellerShare = sellerShareFor(itemKobo);
    const sellerName =
      listing.seller?.profile?.display_name ??
      listing.seller?.profile?.username ??
      listing.seller?.name ??
      "Pantaker seller";

    await tx.order.create({
      data: {
        id,
        order_number: reference,
        listing_id: listing.id,
        seller_id: listing.seller_id,
        buyer_id: user.id,
        buyer_name: user.name ?? user.email,
        buyer_email: user.email,
        seller_name: sellerName,
        item_title: listing.title,
        item_amount_kobo: BigInt(itemKobo),
        commission_kobo: BigInt(commission),
        seller_share_kobo: BigInt(sellerShare),
        currency: "NGN",
        status: "pending_payment",
        expires_at: new Date(Date.now() + 30 * 60 * 1000),
      },
    });
    const payment = await tx.orderPayment.create({
      data: {
        order_id: id,
        reference,
        idempotency_key: `checkout-${id}`,
        amount_kobo: BigInt(itemKobo),
        status: "pending",
      },
    });
    await addEvent(tx, id, "checkout.created", "Checkout opened.");
    return { orderId: id, checkoutUrl: null, paymentId: payment.id };
  });

  if (created.checkoutUrl) return created;

  const payment = await prisma.orderPayment.findUnique({
    where: { id: created.paymentId },
    include: { order: true },
  });
  if (!payment) throw new OrderError("Could not load this checkout.");

  const site = publicSiteUrl();
  try {
    const checkout = await getBachs().checkoutSessions.create(
      {
        pricing: {
          currency: "NGN",
          amount: koboToAmount(Number(payment.amount_kobo)),
        },
        customer: { email: user.email, name: user.name || user.email },
        success_url: `${site}/orders/${created.orderId}?paid=1`,
        cancel_url: `${site}/checkout/${listingId}?cancelled=1`,
        reference: payment.reference,
        metadata: {
          order_id: created.orderId,
          buyer_id: user.id,
          listing_id: listingId,
        },
        payment_method_types: ["NGN_CARD"],
        expires_in_minutes: 30,
      },
      { idempotencyKey: payment.idempotency_key },
    );

    await prisma.orderPayment.update({
      where: { id: payment.id },
      data: {
        checkout_id: checkout.checkout_id,
        checkout_url: checkout.checkout_url,
        updated_at: new Date(),
      },
    });
    await prisma.order.update({
      where: { id: created.orderId },
      data: {
        expires_at: new Date(checkout.expires_at),
        updated_at: new Date(),
      },
    });
    return { orderId: created.orderId, checkoutUrl: checkout.checkout_url };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Checkout could not be created.";
    await prisma.orderPayment.update({
      where: { id: payment.id },
      data: { failure_reason: message, updated_at: new Date() },
    });
    if (error instanceof BachsRestError && error.status < 500) {
      throw new OrderError(error.detail);
    }
    throw new OrderError(
      "The payment provider could not open a checkout. Please try again.",
    );
  }
}

interface PaidEventData {
  charge_id?: unknown;
  checkout_id?: unknown;
  reference?: unknown;
  amount?: unknown;
  currency?: unknown;
  processing_fee?: unknown;
  status?: unknown;
}

/**
 * Fulfil an order from a verified collection.succeeded webhook. This is the ONLY
 * place an order becomes paid. Duplicate deliveries are no-ops, and late
 * payments for an expired checkout still get recorded.
 */
export async function markOrderPaidFromWebhook(
  data: PaidEventData,
): Promise<void> {
  const chargeId = typeof data.charge_id === "string" ? data.charge_id : null;
  const checkoutId =
    typeof data.checkout_id === "string" ? data.checkout_id : null;
  const reference = typeof data.reference === "string" ? data.reference : null;

  if (!chargeId || (!checkoutId && !reference)) {
    throw new OrderNotRetryableError(
      "collection.succeeded had no usable charge or checkout reference.",
    );
  }
  if (typeof data.currency === "string" && data.currency !== "NGN") {
    throw new OrderNotRetryableError("Collection currency was not NGN.");
  }
  const paidKobo =
    typeof data.amount === "string" ? amountToKobo(data.amount) : null;
  if (paidKobo == null) {
    throw new OrderNotRetryableError("Collection had no valid amount.");
  }

  await withServiceContext(null, async (tx) => {
    const payment = await tx.orderPayment.findFirst({
      where: {
        OR: [
          ...(checkoutId ? [{ checkout_id: checkoutId }] : []),
          ...(reference ? [{ reference }] : []),
        ],
      },
      include: { order: true },
    });
    if (!payment) {
      throw new OrderNotRetryableError(
        "No Pantaker order matches this Bachs collection.",
      );
    }
    if (Number(payment.amount_kobo) !== paidKobo) {
      throw new OrderNotRetryableError(
        "The collected amount does not match the order amount.",
      );
    }

    await tx.$queryRaw`select id from public.orders where id = ${payment.order_id}::uuid for update`;

    const order = await tx.order.findUnique({ where: { id: payment.order_id } });
    if (!order) throw new OrderNotRetryableError("Order not found.");
    if (payment.status === "paid" && order.paid_at) {
      return;
    }

    const feeKobo =
      typeof data.processing_fee === "string"
        ? amountToKobo(data.processing_fee)
        : null;

    await tx.orderPayment.update({
      where: { id: payment.id },
      data: {
        charge_id: chargeId,
        checkout_id: checkoutId ?? payment.checkout_id,
        status: "paid",
        provider_fee_kobo: feeKobo == null ? null : BigInt(feeKobo),
        paid_at: new Date(),
        failure_reason: null,
        updated_at: new Date(),
      },
    });

    if (order.status === "pending_payment") {
      const now = new Date();
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: "held",
          paid_at: now,
          pickup_code_hash: hashPickupCode(
            pickupCodeFor(order.id, order.buyer_id ?? order.id),
          ),
          updated_at: now,
        },
      });
      await addEvent(
        tx,
        order.id,
        "payment.held",
        "Payment received. Pantaker is holding the seller's share.",
        { charge_id: chargeId },
      );
      await notifyOrderParties(tx, order, "paid", {
        buyer: {
          title: `Payment received for ${order.item_title}`,
          body: "Pantaker is holding your payment until you receive the item. The seller has been asked to prepare it.",
        },
        seller: {
          title: `Order paid: ${order.item_title}`,
          body: "The buyer's payment is held by Pantaker. Mark the item ready for handover once it is ready.",
        },
      });
      return;
    }

    if (["expired", "payment_failed", "cancelled"].includes(order.status)) {
      const otherActive = await tx.order.findFirst({
        where: {
          listing_id: order.listing_id,
          id: { not: order.id },
          status: { in: [...ACTIVE_ORDER_STATUSES] },
        },
        select: { id: true },
      });
      const activeSale = order.listing_id
        ? await tx.sale.findFirst({
            where: {
              listing_id: order.listing_id,
              status: { in: [...ACTIVE_SALE_STATUSES] },
            },
            select: { id: true },
          })
        : null;
      const conflict = otherActive != null || activeSale != null;
      const now = new Date();
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: conflict ? "release_blocked" : "held",
          paid_at: now,
          pickup_code_hash: hashPickupCode(
            pickupCodeFor(order.id, order.buyer_id ?? order.id),
          ),
          updated_at: now,
        },
      });
      await addEvent(
        tx,
        order.id,
        conflict ? "payment.late_conflict" : "payment.late",
        conflict
          ? "Payment arrived after the checkout closed and the item is already committed. Pantaker must review for a refund."
          : "Payment arrived after the checkout expired and has been accepted.",
      );
      await notifyOrderParties(tx, order, "paid", {
        buyer: {
          title: conflict
            ? `Payment needs review for ${order.item_title}`
            : `Late payment accepted for ${order.item_title}`,
          body: conflict
            ? "Your payment arrived after the checkout closed and the item is already committed. Pantaker will review it and contact you about a refund."
            : "Your payment arrived after the checkout closed and has been accepted.",
        },
        seller: {
          title: conflict
            ? `Payment review needed for ${order.item_title}`
            : `Late payment accepted for ${order.item_title}`,
          body: conflict
            ? "A late payment arrived for an item that is already committed. Pantaker will review before any payout."
            : "A late payment was accepted. Prepare the item for handover.",
        },
        dedupeSuffix: conflict ? "paid-late-conflict" : "paid-late",
      });
      return;
    }

    await addEvent(
      tx,
      order.id,
      "payment.reconfirmed",
      "Duplicate collection confirmation ignored.",
    );
  });
}

export async function markCheckoutExpiredFromWebhook(
  checkoutId: string,
): Promise<void> {
  if (!checkoutId) throw new OrderNotRetryableError("No checkout id.");
  await withServiceContext(null, async (tx) => {
    const payment = await tx.orderPayment.findUnique({
      where: { checkout_id: checkoutId },
      include: { order: true },
    });
    if (!payment) return;
    if (payment.status === "paid") return;
    const failed = payment.status === "failed";
    if (!failed) {
      await tx.orderPayment.update({
        where: { id: payment.id },
        data: { status: "expired", updated_at: new Date() },
      });
    }
    if (payment.order.status === "pending_payment") {
      await tx.order.update({
        where: { id: payment.order_id },
        data: {
          status: failed ? "payment_failed" : "expired",
          updated_at: new Date(),
        },
      });
      await addEvent(
        tx,
        payment.order_id,
        failed ? "payment.failed" : "checkout.expired",
        failed
          ? "The checkout closed after a failed payment attempt."
          : "The checkout expired before payment.",
      );
      await notifyOrderParties(
        tx,
        payment.order,
        failed ? "payment_failed" : "expired",
        {
          buyer: {
            title: failed
              ? `Payment failed for ${payment.order.item_title}`
              : `Checkout expired for ${payment.order.item_title}`,
            body: failed
              ? "No money was taken. Start a new checkout when you are ready."
              : "No money was taken. The item is available again if you still want it.",
          },
        },
      );
    }
  });
}

export async function markCollectionFailedFromWebhook(input: {
  checkoutId?: string | null;
  reference?: string | null;
  reason?: string | null;
}): Promise<void> {
  await withServiceContext(null, async (tx) => {
    const payment = await tx.orderPayment.findFirst({
      where: {
        OR: [
          ...(input.checkoutId ? [{ checkout_id: input.checkoutId }] : []),
          ...(input.reference ? [{ reference: input.reference }] : []),
        ],
      },
      include: { order: true },
    });
    if (!payment || payment.status === "paid") return;
    await tx.orderPayment.update({
      where: { id: payment.id },
      data: {
        status: "failed",
        failure_reason: input.reason ?? "The payment attempt failed.",
        updated_at: new Date(),
      },
    });
    await addEvent(
      tx,
      payment.order_id,
      "payment.failed",
      input.reason ?? "A payment attempt failed. The checkout may still be open.",
    );
    // A declined attempt does not close a checkout the buyer can retry. The
    // order is finalised as `payment_failed` only when the checkout expires.
  });
}

export async function markCollectionUnderpaidFromWebhook(input: {
  checkoutId?: string | null;
  reference?: string | null;
  chargeId?: string | null;
  amountPaid?: string | null;
  amountExpected?: string | null;
  amountRemaining?: string | null;
}): Promise<void> {
  await withServiceContext(null, async (tx) => {
    const payment = await tx.orderPayment.findFirst({
      where: {
        OR: [
          ...(input.checkoutId ? [{ checkout_id: input.checkoutId }] : []),
          ...(input.reference ? [{ reference: input.reference }] : []),
        ],
      },
      include: { order: true },
    });
    if (
      !payment ||
      ["paid", "refunded", "partially_refunded"].includes(payment.status)
    ) {
      return;
    }

    const paid = input.amountPaid;
    const expected = input.amountExpected;
    const remaining = input.amountRemaining;
    const detail =
      paid && expected
        ? `A partial payment of ${paid} was received for a ${expected} charge${
            remaining ? ` (${remaining} remaining)` : ""
          }. The checkout stays open so the buyer can complete it.`
        : "A partial payment was received. The checkout stays open so the buyer can complete it.";

    await addEvent(tx, payment.order_id, "payment.underpaid", detail, {
      charge_id: input.chargeId ?? null,
      amount_paid: paid ?? null,
      amount_expected: expected ?? null,
      amount_remaining: remaining ?? null,
    });

    if (payment.order.status === "pending_payment") {
      await notifyOrderParties(tx, payment.order, "issue", {
        buyer: {
          title: `Payment incomplete for ${payment.order.item_title}`,
          body: detail,
        },
        dedupeSuffix: `underpaid-${input.chargeId ?? payment.id}-${paid ?? "unknown"}`,
      });
    }
  });
}

export async function markOrderReady(
  user: Pick<User, "id" | "admin_role">,
  orderId: string,
): Promise<void> {
  await withUserContext(user, async (tx) => {
    await tx.$queryRaw`select id from public.orders where id = ${orderId}::uuid for update`;
    const order = await tx.order.findFirst({
      where: { id: orderId, seller_id: user.id },
      select: {
        id: true,
        status: true,
        buyer_id: true,
        seller_id: true,
        item_title: true,
      },
    });
    if (!order) throw new OrderError("Order not found.");
    if (order.status !== "held") {
      throw new OrderError("This order is not waiting for handover prep.");
    }
    await tx.order.update({
      where: { id: orderId },
      data: { status: "ready_for_handover", ready_at: new Date(), updated_at: new Date() },
    });
    await addEvent(
      tx,
      orderId,
      "handover.ready",
      "The seller marked the item ready for handover.",
    );
    await notifyOrderParties(tx, order, "ready", {
      buyer: {
        title: `Ready for handover: ${order.item_title}`,
        body: "Arrange collection with the seller. Your pickup code is on the order page.",
      },
    });
  });
}

export async function confirmHandover(
  user: Pick<User, "id" | "admin_role">,
  orderId: string,
  code: string,
): Promise<void> {
  await withUserContext(user, async (tx) => {
    await tx.$queryRaw`select id from public.orders where id = ${orderId}::uuid for update`;
    const order = await tx.order.findFirst({
      where: { id: orderId, seller_id: user.id },
    });
    if (!order) throw new OrderError("Order not found.");
    if (order.status !== "ready_for_handover") {
      throw new OrderError("This order is not ready for handover.");
    }
    if (order.pickup_code_attempts >= 5) {
      throw new OrderError(
        "Too many attempts. Ask Pantaker support to review this handover.",
      );
    }
    if (!verifyPickupCode(code, order.pickup_code_hash)) {
      await tx.order.update({
        where: { id: order.id },
        data: {
          pickup_code_attempts: { increment: 1 },
          updated_at: new Date(),
        },
      });
      throw new OrderError("That pickup code is not correct.");
    }
    const now = new Date();
    await tx.order.update({
      where: { id: order.id },
      data: {
        status: "handed_over",
        handover_at: now,
        release_due_at: releaseDueFrom(now),
        pickup_code_attempts: 0,
        updated_at: now,
      },
    });
    if (order.listing_id) {
      await tx.listing.updateMany({
        where: { id: order.listing_id, item_status: "published" },
        data: { item_status: "sold", updated_at: now },
      });
    }
    await addEvent(
      tx,
      order.id,
      "handover.confirmed",
      "Pickup code verified. The seller will be paid in 72 hours unless the buyer confirms sooner or raises an issue.",
    );
    await notifyOrderParties(tx, order, "handover", {
      buyer: {
        title: `Item collected: ${order.item_title}`,
        body: "The seller confirmed the handover. Confirm receipt once you are happy with the item.",
      },
    });
  });
}

export async function buyerConfirmReceipt(
  user: Pick<User, "id" | "admin_role">,
  orderId: string,
): Promise<void> {
  await withUserContext(user, async (tx) => {
    await tx.$queryRaw`select id from public.orders where id = ${orderId}::uuid for update`;
    const order = await tx.order.findFirst({
      where: { id: orderId, buyer_id: user.id },
    });
    if (!order) throw new OrderError("Order not found.");
    if (order.status !== "handed_over") {
      throw new OrderError("This order is not waiting for buyer confirmation.");
    }
    const now = new Date();
    await tx.order.update({
      where: { id: order.id },
      data: {
        status: "handed_over",
        buyer_confirmed_at: now,
        release_due_at: now,
        updated_at: now,
      },
    });
    await addEvent(
      tx,
      order.id,
      "buyer.confirmed",
      "The buyer confirmed receipt. The seller payout is ready.",
    );
  });
  await releaseOrder(orderId).catch(() => undefined);
}

export async function raiseOrderIssue(
  user: Pick<User, "id" | "admin_role">,
  orderId: string,
  reason: string,
): Promise<void> {
  await withUserContext(user, async (tx) => {
    const order = await tx.order.findFirst({
      where: { id: orderId, buyer_id: user.id },
      select: {
        id: true,
        status: true,
        buyer_id: true,
        seller_id: true,
        item_title: true,
      },
    });
    if (!order) throw new OrderError("Order not found.");
    if (!["held", "ready_for_handover", "handed_over"].includes(order.status)) {
      throw new OrderError("This order can no longer be paused.");
    }
    await tx.order.update({
      where: { id: order.id },
      data: { status: "release_blocked", updated_at: new Date() },
    });
    await addEvent(
      tx,
      order.id,
      "buyer.issue_raised",
      reason,
    );
    await notifyOrderParties(tx, order, "issue", {
      buyer: {
        title: `Issue recorded for ${order.item_title}`,
        body: "Pantaker paused the seller payout and will review the order.",
      },
      seller: {
        title: `Buyer raised an issue: ${order.item_title}`,
        body: "Release is paused while Pantaker reviews the order.",
      },
    });
  });
}

/**
 * Send the seller's share to their connected Bachs account. Idempotent: the
 * transfer row's key is persisted before the API call and reused on retries.
 */
export async function releaseOrder(
  orderId: string,
  options: { force?: boolean } = {},
): Promise<boolean> {
  const prisma = getPrisma();
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      payment: { select: { charge_id: true } },
      seller: { select: { payment_account: true } },
      transfers: { orderBy: { created_at: "desc" } },
    },
  });
  if (!order) return false;
  const due = Boolean(
    order.release_due_at && order.release_due_at.getTime() <= Date.now(),
  );
  const releasable = options.force
    ? order.handover_at != null &&
      ["handed_over", "release_blocked"].includes(order.status)
    : order.status === "handed_over" && due;
  if (!releasable) return false;
  if (!options.force && order.release_attempts >= MAX_RELEASE_ATTEMPTS) {
    return false;
  }
  const sellerAccount = order.seller?.payment_account;
  if (!sellerCanReceivePayments(sellerAccount ?? null)) {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        last_release_error: "Seller has no active Bachs transfers capability.",
        release_attempts: { increment: 1 },
        release_due_at: new Date(Date.now() + RELEASE_CAPABILITY_RETRY_MS),
        updated_at: new Date(),
      },
    });
    return false;
  }

  let transfer = order.transfers.find((row) => row.type === "release");
  if (!transfer) {
    try {
      transfer = await prisma.orderTransfer.create({
        data: {
          order_id: order.id,
          type: "release",
          idempotency_key: `order-release-${order.id}`,
          amount_kobo: order.seller_share_kobo,
          status: "pending",
        },
      });
    } catch {
      transfer =
        (await prisma.orderTransfer.findFirst({
          where: { order_id: order.id, type: "release" },
        })) ?? undefined;
    }
  }
  if (!transfer) return false;
  if (transfer.status === "paid") {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "released",
        released_at: order.released_at ?? new Date(),
        updated_at: new Date(),
        last_release_error: null,
      },
    });
    return true;
  }

  const retryingProviderTransfer =
    transfer.status === "pending" && transfer.bachs_transfer_id != null;

  try {
    const result: BachsTransfer = await createTransfer({
      destination: sellerAccount!.bachs_account_id,
      amount: koboToAmount(Number(order.seller_share_kobo)),
      currency: "NGN",
      description: `Pantaker ${order.order_number} seller share`,
      metadata: { order_id: order.id },
      transferGroup: order.payment?.charge_id ?? order.id,
      idempotencyKey: transfer.idempotency_key,
    });
    const now = new Date();
    await prisma.$transaction([
      prisma.orderTransfer.update({
        where: { id: transfer.id },
        data: {
          bachs_transfer_id: result.id,
          status: result.status === "paid" ? "paid" : "pending",
          error: null,
          updated_at: now,
        },
      }),
      prisma.order.update({
        where: { id: order.id },
        data: {
          status: result.status === "paid" ? "released" : "handed_over",
          released_at: result.status === "paid" ? now : null,
          last_release_error:
            result.status === "paid" ? null : "Transfer created and awaiting settlement.",
          release_attempts: { increment: 1 },
          release_due_at:
            result.status === "paid"
              ? order.release_due_at
              : new Date(Date.now() + RELEASE_RETRY_MS),
          updated_at: now,
        },
      }),
      ...(retryingProviderTransfer
        ? []
        : [
            prisma.orderEvent.create({
              data: {
                order_id: order.id,
                type: "seller.released",
                message:
                  result.status === "paid"
                    ? "The seller's share was transferred to their Bachs account."
                    : "The seller transfer was created and is awaiting settlement.",
                metadata: { transfer_id: result.id },
              },
            }),
          ]),
    ]);
    await notifyOrderParties(prisma, order, "released", {
      seller: {
        title:
          result.status === "paid"
            ? `Payout sent: ${order.item_title}`
            : `Payout processing: ${order.item_title}`,
        body:
          result.status === "paid"
            ? "Your share of the sale was sent to your Bachs account."
            : "Your payout was created and is awaiting settlement.",
      },
      dedupeSuffix: result.status === "paid" ? "released-paid" : "released-pending",
    });
    return result.status === "paid";
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Seller transfer failed.";
    await prisma.$transaction([
      prisma.orderTransfer.update({
        where: { id: transfer.id },
        data: { status: "failed", error: message, updated_at: new Date() },
      }),
      prisma.order.update({
        where: { id: order.id },
        data: {
          last_release_error: message,
          release_attempts: { increment: 1 },
          release_due_at: nextReleaseAttempt(order.release_attempts + 1),
          updated_at: new Date(),
        },
      }),
      ...(order.last_release_error === message
        ? []
        : [
            prisma.orderEvent.create({
              data: {
                order_id: order.id,
                type: "seller.release_failed",
                message: "Seller transfer failed. The cron will retry.",
              },
            }),
          ]),
    ]);
    if (order.release_attempts + 1 >= MAX_RELEASE_ATTEMPTS) {
      await notifyOrderParties(prisma, order, "issue", {
        seller: {
          title: `Payout needs attention: ${order.item_title}`,
          body: message,
        },
        dedupeSuffix: "release-exhausted",
      });
    }
    return false;
  }
}

export async function releaseDueOrders(limit = 25): Promise<{
  attempted: number;
  released: number;
}> {
  const due = await getPrisma().order.findMany({
    where: {
      status: "handed_over",
      release_due_at: { lte: new Date() },
      release_attempts: { lt: MAX_RELEASE_ATTEMPTS },
    },
    orderBy: { release_due_at: "asc" },
    take: limit,
    select: { id: true },
  });
  let released = 0;
  for (const row of due) {
    if (await releaseOrder(row.id)) released += 1;
  }
  return { attempted: due.length, released };
}

/**
 * Reconcile transfers whose create response said `pending`. Bachs can settle a
 * transfer after that response, and `transfer.created` is the only transfer
 * webhook, so the provider's current status is the source of truth.
 */
export async function reconcilePendingTransfers(limit = 25): Promise<{
  checked: number;
  paid: number;
}> {
  const prisma = getPrisma();
  const transfers = await prisma.orderTransfer.findMany({
    where: {
      status: "pending",
      bachs_transfer_id: { not: null },
      updated_at: { lte: new Date(Date.now() - TRANSFER_RECONCILE_AFTER_MS) },
    },
    orderBy: { updated_at: "asc" },
    take: limit,
    include: {
      order: {
        select: {
          seller: {
            select: {
              payment_account: { select: { bachs_account_id: true } },
            },
          },
        },
      },
    },
  });

  let paid = 0;
  for (const transfer of transfers) {
    const transferId = transfer.bachs_transfer_id;
    if (!transferId) continue;
    try {
      const remote = await getTransfer(
        transferId,
        transfer.type === "recovery"
          ? transfer.order.seller?.payment_account?.bachs_account_id
          : null,
      );
      if (remote.status === "paid") {
        await handleTransferWebhook({
          type: "transfer.paid",
          transferId: remote.id,
        });
        paid += 1;
      } else {
        await prisma.orderTransfer.update({
          where: { id: transfer.id },
          data: { updated_at: new Date() },
        });
      }
    } catch (error) {
      await prisma.orderTransfer.update({
        where: { id: transfer.id },
        data: {
          error:
            error instanceof Error
              ? error.message
              : "Could not reconcile transfer status.",
          updated_at: new Date(),
        },
      });
    }
  }

  return { checked: transfers.length, paid };
}

export async function expireStaleCheckouts(limit = 100): Promise<number> {
  const stale = await getPrisma().order.findMany({
    where: {
      status: "pending_payment",
      expires_at: { lte: new Date() },
      payment: { is: { status: { not: "paid" } } },
    },
    orderBy: { expires_at: "asc" },
    take: limit,
    select: {
      id: true,
      buyer_id: true,
      seller_id: true,
      item_title: true,
      payment: { select: { status: true } },
    },
  });
  if (stale.length === 0) return 0;

  return withServiceContext(null, async (tx) => {
    let expired = 0;
    for (const order of stale) {
      const failed = order.payment?.status === "failed";
      const result = await tx.order.updateMany({
        where: {
          id: order.id,
          status: "pending_payment",
          payment: { is: { status: { not: "paid" } } },
        },
        data: {
          status: failed ? "payment_failed" : "expired",
          updated_at: new Date(),
        },
      });
      if (result.count === 0) continue;

      if (!failed) {
        await tx.orderPayment.updateMany({
          where: { order_id: order.id, status: "pending" },
          data: { status: "expired", updated_at: new Date() },
        });
      }
      await addEvent(
        tx,
        order.id,
        failed ? "payment.failed" : "checkout.expired",
        failed
          ? "The checkout closed after a failed payment attempt."
          : "The checkout expired before payment.",
      );
      await notifyOrderParties(
        tx,
        order,
        failed ? "payment_failed" : "expired",
        {
          buyer: {
            title: failed
              ? `Payment failed for ${order.item_title}`
              : `Checkout expired for ${order.item_title}`,
            body: failed
              ? "No money was taken. Start a new checkout when you are ready."
              : "No money was taken. The item is available again if you still want it.",
          },
        },
      );
      expired += 1;
    }
    return expired;
  });
}

export async function refundOrder(
  admin: Pick<User, "id" | "admin_role">,
  orderId: string,
  reason: string,
): Promise<void> {
  const order = await getPrisma().order.findUnique({
    where: { id: orderId },
    include: {
      payment: true,
      refunds: { orderBy: { created_at: "desc" } },
    },
  });
  if (!order) throw new OrderError("Order not found.");
  if (!order.payment?.charge_id) {
    throw new OrderError("This order has no Bachs charge to refund.");
  }
  if (order.status === "refunded") {
    throw new OrderError("This order is already refunded.");
  }

  let refund = refundToRetry(order.refunds);
  const created = !refund;
  if (!refund) {
    refund = await getPrisma().orderRefund.create({
      data: {
        order_id: order.id,
        idempotency_key: `order-refund-${order.id}-${randomUUID()}`,
        amount_kobo: order.item_amount_kobo,
        reason,
        requested_by: admin.id,
        status: "pending",
      },
    });
  }
  const activeRefund = refund;

  const otherActive = order.listing_id
    ? await getPrisma().order.findFirst({
        where: {
          listing_id: order.listing_id,
          id: { not: order.id },
          status: { in: [...ACTIVE_ORDER_STATUSES] },
        },
        select: { id: true },
      })
    : null;
  const canShowPending = order.released_at == null && otherActive == null;
  await withUserContext(admin, async (tx) => {
    if (!created) {
      await tx.orderRefund.update({
        where: { id: activeRefund.id },
        data: {
          status: "pending",
          failure_reason: null,
          reason,
          updated_at: new Date(),
        },
      });
    }
    if (canShowPending && order.status !== "refund_pending") {
      await tx.order.update({
        where: { id: order.id },
        data: { status: "refund_pending", updated_at: new Date() },
      });
    }
    if (created) {
      await addEvent(
        tx,
        order.id,
        "refund.requested",
        `Admin requested a full refund: ${reason}`,
      );
    }
  });

  try {
    const result = await createRefund({
      chargeId: order.payment.charge_id,
      amount: koboToAmount(Number(order.item_amount_kobo)),
      reference: activeRefund.idempotency_key,
      reason,
      idempotencyKey: activeRefund.idempotency_key,
    });
    await getPrisma().orderRefund.update({
      where: { id: activeRefund.id },
      data: {
        bachs_refund_id: result.refund_id,
        status: result.status === "success" ? "paid" : "pending",
        failure_reason: null,
        updated_at: new Date(),
      },
    });
    if (result.status === "success") {
      await withUserContext(admin, async (tx) => {
        const now = new Date();
        await tx.order.update({
          where: { id: order.id },
          data: { status: "refunded", refunded_at: now, updated_at: now },
        });
        await addEvent(
          tx,
          order.id,
          "refund.paid",
          "The buyer was refunded.",
        );
        await notifyOrderParties(tx, order, "refunded", {
          buyer: {
            title: `Refund sent for ${order.item_title}`,
            body: "The refund was issued to your original payment method.",
          },
          seller: {
            title: `Order refunded: ${order.item_title}`,
            body: "The buyer was refunded. Pantaker handles any recovery separately.",
          },
          dedupeSuffix: "refund-paid",
        });
      });
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Refund could not be created.";
    const status = error instanceof BachsRestError ? error.status : 0;
    await getPrisma().orderRefund.update({
      where: { id: activeRefund.id },
      data: {
        status: "failed",
        failure_reason: `[${status}] ${message}`,
        updated_at: new Date(),
      },
    });
    await withUserContext(admin, async (tx) => {
      const otherActive = order.listing_id
        ? await tx.order.findFirst({
            where: {
              listing_id: order.listing_id,
              id: { not: order.id },
              status: { in: [...ACTIVE_ORDER_STATUSES] },
            },
            select: { id: true },
          })
        : null;
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: otherActive
            ? "release_blocked"
            : paidStatusAfterRefundFailure(order),
          updated_at: new Date(),
        },
      });
      await addEvent(
        tx,
        order.id,
        "refund.failed",
        "The refund could not be created. The order was restored.",
      );
    });
    throw new OrderError(message);
  }
}

/**
 * Apply a seller-transfer webhook. A transfer can settle after the initial API
 * call returned `pending`, so `transfer.paid` is what actually releases the
 * order and tells the seller the money is available.
 */
export async function handleTransferWebhook(input: {
  type: "transfer.created" | "transfer.paid" | "transfer.failed" | "transfer.updated";
  transferId?: string | null;
  reference?: string | null;
  status?: string | null;
  failureReason?: string | null;
}): Promise<void> {
  const transferId = input.transferId?.trim() || null;
  const reference = input.reference?.trim() || null;
  if (!transferId && !reference) {
    throw new OrderNotRetryableError("Transfer event had no reference.");
  }

  await withServiceContext(null, async (tx) => {
    const transfer = await tx.orderTransfer.findFirst({
      where: {
        OR: [
          ...(transferId ? [{ bachs_transfer_id: transferId }] : []),
          ...(reference ? [{ idempotency_key: reference }] : []),
        ],
      },
      include: { order: true },
    });
    if (!transfer) throw new OrderNotRetryableError("Transfer not found.");

    const status = transferStatusFromEvent({
      type: input.type,
      status: input.status,
      currentStatus: transfer.status,
    });
    if (transfer.status === "paid" && status !== "paid") return;
    const now = new Date();

    if (status === "paid") {
      const alreadyPaid = transfer.status === "paid";
      await tx.orderTransfer.update({
        where: { id: transfer.id },
        data: {
          status: "paid",
          bachs_transfer_id: transferId ?? transfer.bachs_transfer_id,
          error: null,
          updated_at: now,
        },
      });
      if (alreadyPaid) return;

      if (transfer.type === "release") {
        const onHold = [
          "refunded",
          "refund_pending",
          "disputed",
          "release_blocked",
        ].includes(transfer.order.status);
        await tx.order.update({
          where: { id: transfer.order_id },
          data: onHold
            ? {
                last_release_error:
                  "The seller transfer settled while the order was on hold.",
                updated_at: now,
              }
            : {
                status: "released",
                released_at: transfer.order.released_at ?? now,
                last_release_error: null,
                updated_at: now,
              },
        });
        await addEvent(
          tx,
          transfer.order_id,
          onHold ? "seller.released_on_hold" : "seller.released",
          onHold
            ? "The seller transfer settled while the order was on hold. Review the order for recovery."
            : "The seller's share settled in their Bachs account.",
          { transfer_id: transferId ?? transfer.bachs_transfer_id },
        );
        await notifyOrderParties(tx, transfer.order, "released", {
          seller: {
            title: `Payout sent: ${transfer.order.item_title}`,
            body: "Your share of the sale settled in your Bachs account.",
          },
          dedupeSuffix: `released-paid-${transfer.id}`,
        });
      }
      return;
    }

    if (status === "failed" || status === "reversed" || status === "cancelled") {
      const reason = input.failureReason ?? "The provider reported the transfer failed.";
      await tx.orderTransfer.update({
        where: { id: transfer.id },
        data: { status: "failed", error: reason, updated_at: now },
      });
      if (transfer.type === "release") {
        await tx.order.update({
          where: { id: transfer.order_id },
          data: {
            last_release_error: reason,
            release_attempts: { increment: 1 },
            release_due_at: nextReleaseAttempt(transfer.order.release_attempts + 1),
            updated_at: now,
          },
        });
        await addEvent(
          tx,
          transfer.order_id,
          "seller.release_failed",
          "The provider reported the seller transfer failed. It will be retried.",
        );
        if (transfer.order.release_attempts + 1 >= MAX_RELEASE_ATTEMPTS) {
          await notifyOrderParties(tx, transfer.order, "issue", {
            seller: {
              title: `Payout needs attention: ${transfer.order.item_title}`,
              body: reason,
            },
            dedupeSuffix: `release-exhausted-${transfer.id}`,
          });
        }
      }
      return;
    }

    await tx.orderTransfer.update({
      where: { id: transfer.id },
      data: {
        status: "pending",
        bachs_transfer_id: transferId ?? transfer.bachs_transfer_id,
        error: null,
        updated_at: now,
      },
    });
  });
}

/** Apply a seller bank-withdrawal webhook to the local payout record. */
export async function handlePayoutWebhook(input: {
  type: "payout.processing" | "payout.paid" | "payout.failed";
  payoutId?: string | null;
  reference?: string | null;
  status?: string | null;
  failureReason?: string | null;
}): Promise<void> {
  const payoutId = input.payoutId?.trim() || null;
  const reference = input.reference?.trim() || null;
  if (!payoutId && !reference) {
    throw new OrderNotRetryableError("Payout event had no reference.");
  }

  await withServiceContext(null, async (tx) => {
    const payout = await tx.sellerPayout.findFirst({
      where: {
        OR: [
          ...(payoutId ? [{ bachs_payout_id: payoutId }] : []),
          ...(reference
            ? [{ reference }, { idempotency_key: reference }]
            : []),
        ],
      },
    });
    if (!payout) throw new OrderNotRetryableError("Payout not found.");
    if (payout.status === "completed") return;

    const status =
      input.type === "payout.paid"
        ? "completed"
        : input.type === "payout.failed"
          ? "failed"
          : "processing";
    await tx.sellerPayout.update({
      where: { id: payout.id },
      data: {
        status,
        bachs_payout_id: payoutId ?? payout.bachs_payout_id,
        failure_reason:
          status === "failed"
            ? (input.failureReason ?? "Bachs reported the payout failed.")
            : null,
        updated_at: new Date(),
      },
    });
  });
}

export async function handleRefundWebhook(input: {
  type: "refund.created" | "refund.paid" | "refund.failed";
  refundId?: string | null;
  chargeId?: string | null;
  reference?: string | null;
  status?: string | null;
}): Promise<void> {
  await withServiceContext(null, async (tx) => {
    const refund = await tx.orderRefund.findFirst({
      where: {
        OR: [
          ...(input.refundId ? [{ bachs_refund_id: input.refundId }] : []),
          ...(input.reference ? [{ idempotency_key: input.reference }] : []),
        ],
      },
      include: { order: true },
    });
    if (!refund) throw new OrderNotRetryableError("Refund not found.");

    if (input.type !== "refund.paid" && refund.status === "paid") return;
    if (
      input.type === "refund.created" &&
      (refund.status === "paid" || refund.status === "failed")
    ) {
      return;
    }

    if (input.type === "refund.created") {
      await tx.orderRefund.update({
        where: { id: refund.id },
        data: {
          status: "pending",
          bachs_refund_id: input.refundId ?? refund.bachs_refund_id,
          updated_at: new Date(),
        },
      });
      return;
    }

    if (input.type === "refund.paid") {
      const now = new Date();
      await tx.orderRefund.update({
        where: { id: refund.id },
        data: {
          status: "paid",
          bachs_refund_id: input.refundId ?? refund.bachs_refund_id,
          failure_reason: null,
          updated_at: now,
        },
      });
      await tx.order.update({
        where: { id: refund.order_id },
        data: { status: "refunded", refunded_at: now, updated_at: now },
      });
      await addEvent(tx, refund.order_id, "refund.paid", "The buyer was refunded.");
      await notifyOrderParties(tx, refund.order, "refunded", {
        buyer: {
          title: `Refund sent for ${refund.order.item_title}`,
          body: "The refund was issued to your original payment method.",
        },
        seller: {
          title: `Order refunded: ${refund.order.item_title}`,
          body: "The buyer was refunded. Pantaker handles any recovery separately.",
        },
        dedupeSuffix: "refund-paid",
      });
      return;
    }

    const now = new Date();
    await tx.orderRefund.update({
      where: { id: refund.id },
      data: {
        status: "failed",
        failure_reason: "Bachs reported the refund failed.",
        updated_at: now,
      },
    });
    const otherActive = refund.order.listing_id
      ? await tx.order.findFirst({
          where: {
            listing_id: refund.order.listing_id,
            id: { not: refund.order.id },
            status: { in: [...ACTIVE_ORDER_STATUSES] },
          },
          select: { id: true },
        })
      : null;
    await tx.order.update({
      where: { id: refund.order_id },
      data: {
        status: otherActive
          ? "release_blocked"
          : paidStatusAfterRefundFailure(refund.order),
        updated_at: now,
      },
    });
    await addEvent(
      tx,
      refund.order_id,
      "refund.failed",
      "The refund failed. No money moved.",
    );
    await notifyOrderParties(tx, refund.order, "issue", {
      buyer: {
        title: `Refund failed for ${refund.order.item_title}`,
        body: "Pantaker is reviewing the failed refund and will try again.",
      },
      dedupeSuffix: "refund-failed",
    });
  });
}

export async function attemptRecoveryForRefund(orderId: string): Promise<void> {
  const order = await getPrisma().order.findUnique({
    where: { id: orderId },
    include: {
      seller: { select: { payment_account: true } },
      transfers: { where: { type: "recovery" } },
    },
  });
  if (!order?.released_at) return;
  if (order.transfers.some((row) => row.status === "paid")) return;
  const account = order.seller?.payment_account;
  if (!account) return;
  if (!sellerCanReceivePayments(account)) return;

  let recovery = order.transfers[0];
  if (!recovery) {
    recovery = await getPrisma().orderTransfer.create({
      data: {
        order_id: order.id,
        type: "recovery",
        idempotency_key: `order-recovery-${order.id}`,
        amount_kobo: order.seller_share_kobo,
        status: "pending",
      },
    });
  }

  try {
    const result = await createTransfer({
      accountId: account.bachs_account_id,
      destination: "self",
      amount: koboToAmount(Number(order.seller_share_kobo)),
      currency: "NGN",
      description: `Pantaker ${order.order_number} refund recovery`,
      metadata: { order_id: order.id },
      idempotencyKey: recovery.idempotency_key,
    });
    await getPrisma().orderTransfer.update({
      where: { id: recovery.id },
      data: {
        bachs_transfer_id: result.id,
        status: result.status === "paid" ? "paid" : "pending",
        error: null,
        updated_at: new Date(),
      },
    });
  } catch (error) {
    await getPrisma().orderTransfer.update({
      where: { id: recovery.id },
      data: {
        status: "failed",
        error: error instanceof Error ? error.message : "Recovery transfer failed.",
        updated_at: new Date(),
      },
    });
  }
}

/**
 * Start recovery transfers for refunded orders where the seller was already
 * paid. Dispute losses and refund.webhook failures both land here; the cron
 * retries failed transfers with their persisted idempotency key.
 */
export async function recoverRefundedOrders(limit = 25): Promise<number> {
  const cutoff = new Date(Date.now() - RECOVERY_RETRY_AFTER_MS);
  const orders = await getPrisma().order.findMany({
    where: {
      refunded_at: { not: null },
      released_at: { not: null },
      transfers: { none: { type: "recovery", status: "paid" } },
      OR: [
        { transfers: { none: { type: "recovery" } } },
        {
          transfers: {
            some: {
              type: "recovery",
              status: "failed",
              updated_at: { lte: cutoff },
            },
          },
        },
      ],
    },
    orderBy: { refunded_at: "asc" },
    take: limit,
    select: { id: true },
  });

  let attempted = 0;
  for (const order of orders) {
    await attemptRecoveryForRefund(order.id);
    attempted += 1;
  }
  return attempted;
}

export async function handleDisputeWebhook(input: {
  type: "dispute.created" | "dispute.updated";
  disputeId: string;
  chargeId: string;
  status: string;
  amount?: string | null;
  responseDeadlineAt?: string | null;
  occurredAt?: Date | null;
}): Promise<void> {
  await withServiceContext(null, async (tx) => {
    const payment = await tx.orderPayment.findFirst({
      where: { charge_id: input.chargeId },
      select: { order_id: true },
    });
    if (!payment) throw new OrderNotRetryableError("Disputed charge not found.");

    const existing = await tx.orderDispute.findUnique({
      where: { bachs_dispute_id: input.disputeId },
      select: { status: true, last_event_at: true },
    });
    if (isDisputeEventStale(existing?.last_event_at, input.occurredAt)) {
      throw new OrderNotRetryableError("Stale dispute event ignored.");
    }

    const eventAt = input.occurredAt ?? new Date();
    const amountKobo = input.amount ? amountToKobo(input.amount) : null;
    await tx.orderDispute.upsert({
      where: { bachs_dispute_id: input.disputeId },
      create: {
        order_id: payment.order_id,
        bachs_dispute_id: input.disputeId,
        status: input.status,
        amount_kobo: amountKobo == null ? null : BigInt(amountKobo),
        evidence_due_at: input.responseDeadlineAt
          ? new Date(input.responseDeadlineAt)
          : null,
        last_event_at: eventAt,
      },
      update: {
        status: input.status,
        amount_kobo: amountKobo == null ? null : BigInt(amountKobo),
        evidence_due_at: input.responseDeadlineAt
          ? new Date(input.responseDeadlineAt)
          : null,
        last_event_at: eventAt,
        updated_at: new Date(),
      },
    });

    const order = await tx.order.findUnique({ where: { id: payment.order_id } });
    if (!order) return;

    if (["won", "prevented"].includes(input.status)) {
      if (order.status === "disputed") {
        const now = new Date();
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: order.handover_at ? "handed_over" : "held",
            release_due_at: order.handover_at ? now : order.release_due_at,
            updated_at: now,
          },
        });
        await addEvent(
          tx,
          order.id,
          "dispute.won",
          "The dispute was resolved in Pantaker's favour. Release can continue.",
        );
      }
      await notifyOrderParties(tx, order, "disputed", {
        buyer: {
          title: `Dispute closed for ${order.item_title}`,
          body: "The dispute was resolved in the seller's favour.",
        },
        seller: {
          title: `Dispute won: ${order.item_title}`,
          body: "The dispute was resolved in your favour. The payout can continue.",
        },
        dedupeSuffix: `dispute-won-${input.status}`,
      });
      return;
    }

    if (["lost", "closed"].includes(input.status)) {
      const now = new Date();
      const disputedKobo = input.amount ? amountToKobo(input.amount) : null;
      await tx.orderRefund.upsert({
        where: { idempotency_key: `dispute-refund-${input.disputeId}` },
        create: {
          order_id: order.id,
          idempotency_key: `dispute-refund-${input.disputeId}`,
          amount_kobo:
            disputedKobo == null ? order.item_amount_kobo : BigInt(disputedKobo),
          status: "paid",
          reason: "Card network dispute",
        },
        update: {
          status: "paid",
          failure_reason: null,
          updated_at: now,
        },
      });
      await tx.order.update({
        where: { id: order.id },
        data: { status: "refunded", refunded_at: now, updated_at: now },
      });
      await addEvent(
        tx,
        order.id,
        "dispute.lost",
        "The dispute was lost. The buyer was refunded by the card network.",
      );
      await notifyOrderParties(tx, order, "refunded", {
        buyer: {
          title: `Dispute resolved for ${order.item_title}`,
          body: "The card network refunded the payment to you.",
        },
        seller: {
          title: `Dispute lost: ${order.item_title}`,
          body: "The card network refunded the buyer. Pantaker will recover any paid seller share separately.",
        },
        dedupeSuffix: `dispute-lost-${input.status}`,
      });
      return;
    }

    const now = new Date();
    await tx.order.update({
      where: { id: order.id },
      data: { status: "disputed", updated_at: now },
    });
    await addEvent(
      tx,
      order.id,
      input.type,
      `Dispute status: ${input.status}. Seller payout is on hold.`,
    );
    await notifyOrderParties(tx, order, "disputed", {
      buyer: {
        title: `Dispute update for ${order.item_title}`,
        body: `The dispute status is now ${input.status}.`,
      },
      seller: {
        title: `Dispute opened: ${order.item_title}`,
        body: "The buyer's bank raised a dispute. The payout is on hold while Pantaker responds.",
      },
      dedupeSuffix: `disputed-${input.status}`,
    });
  });
}

import { requireSeller, requireUser } from "@/features/auth/authorization";
import { getPrisma } from "@/lib/prisma";
import {
  ACTIVE_ORDER_STATUSES,
  type OrderStatus,
} from "@/features/orders/lifecycle";

export interface OrderSummary {
  id: string;
  order_number: string;
  listing_id: string | null;
  item_title: string;
  status: OrderStatus;
  item_amount_kobo: number;
  commission_kobo: number;
  seller_share_kobo: number;
  buyer_name: string | null;
  seller_name: string | null;
  created_at: string;
  paid_at: string | null;
  release_due_at: string | null;
  released_at: string | null;
}

export interface OrderEventView {
  id: string;
  type: string;
  message: string | null;
  created_at: string;
}

export interface OrderPaymentView {
  status: string;
  charge_id: string | null;
  checkout_id: string | null;
  checkout_url: string | null;
  reference: string;
  provider_fee_kobo: number | null;
  failure_reason: string | null;
  paid_at: string | null;
}

export interface OrderRefundView {
  id: string;
  amount_kobo: number;
  status: string;
  reason: string | null;
  failure_reason: string | null;
  created_at: string;
}

export interface OrderDisputeView {
  id: string;
  status: string;
  amount_kobo: number | null;
  evidence_due_at: string | null;
  created_at: string;
}

export interface OrderTransferView {
  id: string;
  type: string;
  status: string;
  amount_kobo: number;
  error: string | null;
  created_at: string;
}

export interface OrderCollectionView {
  area: string | null;
  city: string | null;
  pickup_notes: string | null;
}

export interface OrderDetail extends OrderSummary {
  buyer_id: string | null;
  seller_id: string | null;
  buyer_email: string | null;
  pickup_code_hash: string | null;
  ready_at: string | null;
  handover_at: string | null;
  buyer_confirmed_at: string | null;
  cancelled_at: string | null;
  refunded_at: string | null;
  last_release_error: string | null;
  collection: OrderCollectionView | null;
  payment: OrderPaymentView | null;
  events: OrderEventView[];
  refunds: OrderRefundView[];
  disputes: OrderDisputeView[];
  transfers: OrderTransferView[];
}

export interface BuyerListingOrder {
  id: string;
  order_number: string;
  status: OrderStatus;
  checkoutUrl: string | null;
  paymentStatus: string | null;
  paymentFailureReason: string | null;
}

interface OrderRow {
  id: string;
  order_number: string;
  listing_id: string | null;
  item_title: string;
  status: string;
  item_amount_kobo: bigint;
  commission_kobo: bigint;
  seller_share_kobo: bigint;
  buyer_name: string | null;
  buyer_email: string | null;
  buyer_id: string | null;
  seller_id: string | null;
  seller_name: string | null;
  pickup_code_hash: string | null;
  created_at: Date;
  paid_at: Date | null;
  ready_at: Date | null;
  handover_at: Date | null;
  buyer_confirmed_at: Date | null;
  release_due_at: Date | null;
  released_at: Date | null;
  cancelled_at: Date | null;
  refunded_at: Date | null;
  last_release_error: string | null;
}

function toSummary(row: OrderRow): OrderSummary {
  return {
    id: row.id,
    order_number: row.order_number,
    listing_id: row.listing_id,
    item_title: row.item_title,
    status: row.status as OrderStatus,
    item_amount_kobo: Number(row.item_amount_kobo),
    commission_kobo: Number(row.commission_kobo),
    seller_share_kobo: Number(row.seller_share_kobo),
    buyer_name: row.buyer_name,
    seller_name: row.seller_name,
    created_at: row.created_at.toISOString(),
    paid_at: row.paid_at?.toISOString() ?? null,
    release_due_at: row.release_due_at?.toISOString() ?? null,
    released_at: row.released_at?.toISOString() ?? null,
  };
}

const detailInclude = {
  payment: true,
  listing: { select: { area: true, city: true, pickup_notes: true } },
  events: { orderBy: { created_at: "asc" as const } },
  refunds: { orderBy: { created_at: "desc" as const } },
  disputes: { orderBy: { created_at: "desc" as const } },
  transfers: { orderBy: { created_at: "desc" as const } },
};

type DetailRow = OrderRow & {
  listing: {
    area: string | null;
    city: string | null;
    pickup_notes: string | null;
  } | null;
  payment: {
    status: string;
    charge_id: string | null;
    checkout_id: string | null;
    checkout_url: string | null;
    reference: string;
    provider_fee_kobo: bigint | null;
    failure_reason: string | null;
    paid_at: Date | null;
  } | null;
  events: Array<{ id: string; type: string; message: string | null; created_at: Date }>;
  refunds: Array<{
    id: string;
    amount_kobo: bigint;
    status: string;
    reason: string | null;
    failure_reason: string | null;
    created_at: Date;
  }>;
  disputes: Array<{
    id: string;
    status: string;
    amount_kobo: bigint | null;
    evidence_due_at: Date | null;
    created_at: Date;
  }>;
  transfers: Array<{
    id: string;
    type: string;
    status: string;
    amount_kobo: bigint;
    error: string | null;
    created_at: Date;
  }>;
};

function toDetail(row: DetailRow): OrderDetail {
  return {
    ...toSummary(row),
    buyer_id: row.buyer_id,
    seller_id: row.seller_id,
    buyer_email: row.buyer_email,
    pickup_code_hash: row.pickup_code_hash,
    ready_at: row.ready_at?.toISOString() ?? null,
    handover_at: row.handover_at?.toISOString() ?? null,
    buyer_confirmed_at: row.buyer_confirmed_at?.toISOString() ?? null,
    cancelled_at: row.cancelled_at?.toISOString() ?? null,
    refunded_at: row.refunded_at?.toISOString() ?? null,
    last_release_error: row.last_release_error,
    collection: row.listing
      ? {
          area: row.listing.area,
          city: row.listing.city,
          pickup_notes: row.listing.pickup_notes,
        }
      : null,
    payment: row.payment
      ? {
          status: row.payment.status,
          charge_id: row.payment.charge_id,
          checkout_id: row.payment.checkout_id,
          checkout_url: row.payment.checkout_url,
          reference: row.payment.reference,
          provider_fee_kobo:
            row.payment.provider_fee_kobo == null
              ? null
              : Number(row.payment.provider_fee_kobo),
          failure_reason: row.payment.failure_reason,
          paid_at: row.payment.paid_at?.toISOString() ?? null,
        }
      : null,
    events: row.events.map((event) => ({
      id: event.id,
      type: event.type,
      message: event.message,
      created_at: event.created_at.toISOString(),
    })),
    refunds: row.refunds.map((refund) => ({
      id: refund.id,
      amount_kobo: Number(refund.amount_kobo),
      status: refund.status,
      reason: refund.reason,
      failure_reason: refund.failure_reason,
      created_at: refund.created_at.toISOString(),
    })),
    disputes: row.disputes.map((dispute) => ({
      id: dispute.id,
      status: dispute.status,
      amount_kobo:
        dispute.amount_kobo == null ? null : Number(dispute.amount_kobo),
      evidence_due_at: dispute.evidence_due_at?.toISOString() ?? null,
      created_at: dispute.created_at.toISOString(),
    })),
    transfers: row.transfers.map((transfer) => ({
      id: transfer.id,
      type: transfer.type,
      status: transfer.status,
      amount_kobo: Number(transfer.amount_kobo),
      error: transfer.error,
      created_at: transfer.created_at.toISOString(),
    })),
  };
}

export async function getBuyerOrders(): Promise<OrderSummary[]> {
  const user = await requireUser("/orders");
  if (!user) return [];
  const rows = await getPrisma().order.findMany({
    where: { buyer_id: user.id },
    orderBy: { created_at: "desc" },
    take: 100,
  });
  return rows.map((row) => toSummary(row));
}

export async function getBuyerOrder(id: string): Promise<OrderDetail | null> {
  const user = await requireUser(`/orders/${id}`);
  if (!user) return null;
  const row = await getPrisma().order.findFirst({
    where: { id, buyer_id: user.id },
    include: detailInclude,
  });
  return row ? toDetail(row as DetailRow) : null;
}

/** The signed-in buyer's active order for a listing, if one exists. */
export async function getBuyerOrderForListing(
  listingId: string,
  buyerId: string,
): Promise<BuyerListingOrder | null> {
  const row = await getPrisma().order.findFirst({
    where: {
      listing_id: listingId,
      buyer_id: buyerId,
      status: { in: [...ACTIVE_ORDER_STATUSES] },
    },
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      order_number: true,
      status: true,
      payment: {
        select: { status: true, checkout_url: true, failure_reason: true },
      },
    },
  });
  if (!row) return null;
  return {
    id: row.id,
    order_number: row.order_number,
    status: row.status as OrderStatus,
    checkoutUrl: row.payment?.checkout_url ?? null,
    paymentStatus: row.payment?.status ?? null,
    paymentFailureReason: row.payment?.failure_reason ?? null,
  };
}

export async function getSellerOrders(): Promise<OrderSummary[]> {
  const user = await requireSeller("/seller/orders");
  if (!user) return [];
  const rows = await getPrisma().order.findMany({
    where: { seller_id: user.id },
    orderBy: { created_at: "desc" },
    take: 100,
  });
  return rows.map((row) => toSummary(row));
}

export async function getSellerOrder(id: string): Promise<OrderDetail | null> {
  const user = await requireSeller(`/seller/orders/${id}`);
  if (!user) return null;
  const row = await getPrisma().order.findFirst({
    where: { id, seller_id: user.id },
    include: detailInclude,
  });
  return row ? toDetail(row as DetailRow) : null;
}

export async function getAdminOrders(): Promise<OrderDetail[]> {
  const rows = await getPrisma().order.findMany({
    orderBy: { created_at: "desc" },
    take: 200,
    include: detailInclude,
  });
  return rows.map((row) => toDetail(row as DetailRow));
}

export async function getAdminOrder(id: string): Promise<OrderDetail | null> {
  const row = await getPrisma().order.findUnique({
    where: { id },
    include: detailInclude,
  });
  return row ? toDetail(row as DetailRow) : null;
}

export interface AdminWebhookEvent {
  id: string;
  type: string;
  account_id: string | null;
  received_at: string;
  processed_at: string | null;
  error: string | null;
  attempts: number;
}

/** Recent Bachs webhook deliveries, including failures that still need a retry. */
export async function getRecentWebhookEvents(
  limit = 100,
): Promise<AdminWebhookEvent[]> {
  const rows = await getPrisma().bachsWebhookEvent.findMany({
    orderBy: { received_at: "desc" },
    take: limit,
  });
  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    account_id: row.account_id,
    received_at: row.received_at.toISOString(),
    processed_at: row.processed_at?.toISOString() ?? null,
    error: row.error,
    attempts: row.attempts,
  }));
}

export async function hasActiveOnlineOrder(listingId: string): Promise<boolean> {
  const row = await getPrisma().order.findFirst({
    where: {
      listing_id: listingId,
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
  });
  return Boolean(row);
}

export interface ListingPurchaseState {
  available: boolean;
  reason: string | null;
  hasActiveOrder: boolean;
  hasActiveSale: boolean;
  sellerReady: boolean;
}

/** Whether a listing can show Buy now, without exposing the reason publicly. */
export async function getListingPurchaseState(
  listingId: string,
  sellerId: string,
): Promise<ListingPurchaseState> {
  const prisma = getPrisma();
  const [order, sale, account] = await Promise.all([
    prisma.order.findFirst({
      where: {
        listing_id: listingId,
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
    }),
    prisma.sale.findFirst({
      where: {
        listing_id: listingId,
        status: { in: ["awaiting_confirmation", "reserved", "collection_arranged"] },
      },
      select: { id: true },
    }),
    prisma.sellerPaymentAccount.findUnique({
      where: { user_id: sellerId },
      select: { transfers_status: true },
    }),
  ]);

  const sellerReady = account?.transfers_status === "active";
  if (order) {
    return {
      available: false,
      reason: "An online purchase is already in progress for this item.",
      hasActiveOrder: true,
      hasActiveSale: Boolean(sale),
      sellerReady,
    };
  }
  if (sale) {
    return {
      available: false,
      reason: "The seller is already handling a sale for this item.",
      hasActiveOrder: false,
      hasActiveSale: true,
      sellerReady,
    };
  }
  if (!sellerReady) {
    return {
      available: false,
      reason: "This seller is not set up to take online payments yet.",
      hasActiveOrder: false,
      hasActiveSale: false,
      sellerReady: false,
    };
  }
  return {
    available: true,
    reason: null,
    hasActiveOrder: false,
    hasActiveSale: false,
    sellerReady: true,
  };
}

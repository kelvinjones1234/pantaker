import { NextResponse } from "next/server";
import { verifyBachsWebhook } from "@/lib/bachs/webhook";
import { getBachsSettings } from "@/lib/bachs/config";
import { withServiceContext } from "@/lib/db/context";
import {
  handleDisputeWebhook,
  handlePayoutWebhook,
  handleRefundWebhook,
  handleTransferWebhook,
  markCheckoutExpiredFromWebhook,
  markCollectionFailedFromWebhook,
  markCollectionUnderpaidFromWebhook,
  markOrderPaidFromWebhook,
  OrderNotRetryableError,
} from "@/features/orders/service";
import {
  paymentAccountByBachsId,
  refreshSellerPaymentAccount,
} from "@/features/payments/seller-accounts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function idOf(value: unknown): string | null {
  const direct = str(value);
  if (direct) return direct;
  if (value && typeof value === "object" && "id" in value) {
    return str((value as { id?: unknown }).id);
  }
  return null;
}

function dateOf(value: unknown): Date | null {
  if (typeof value !== "string" || !value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function processEvent(event: {
  id: string;
  type: string;
  data: Record<string, unknown>;
  createdAt: string | null;
}): Promise<void> {
  const data = event.data;
  switch (event.type) {
    case "collection.succeeded":
      await markOrderPaidFromWebhook(data);
      return;
    case "collection.failed":
      await markCollectionFailedFromWebhook({
        checkoutId: str(data.checkout_id),
        reference: str(data.reference),
        reason: str(data.reason),
      });
      return;
    case "collection.underpaid":
      await markCollectionUnderpaidFromWebhook({
        checkoutId: str(data.checkout_id),
        reference: str(data.reference),
        chargeId: str(data.charge_id),
        amountPaid: str(data.amount_paid),
        amountExpected: str(data.amount_expected),
        amountRemaining: str(data.amount_remaining),
      });
      return;
    case "checkout.expired": {
      const checkoutId = str(data.checkout_id) ?? str(data.id);
      if (!checkoutId) throw new OrderNotRetryableError("No checkout id.");
      await markCheckoutExpiredFromWebhook(checkoutId);
      return;
    }
    case "refund.created":
    case "refund.paid":
    case "refund.failed": {
      const refundId = str(data.refund_id) ?? str(data.id);
      await handleRefundWebhook({
        type: event.type,
        refundId,
        chargeId: str(data.charge_id),
        reference: str(data.reference),
        status: str(data.status),
      });
      return;
    }
    case "dispute.created":
    case "dispute.updated": {
      const disputeId = str(data.dispute_id) ?? str(data.id);
      const chargeId = str(data.charge_id) ?? idOf(data.charge);
      const status = str(data.status);
      if (!disputeId || !chargeId || !status) {
        throw new OrderNotRetryableError("Dispute event was incomplete.");
      }
      await handleDisputeWebhook({
        type: event.type,
        disputeId,
        chargeId,
        status,
        amount: str(data.amount),
        responseDeadlineAt: str(data.response_deadline_at),
        occurredAt: dateOf(event.createdAt),
      });
      return;
    }
    case "account.updated":
    case "capability.updated": {
      const accountId = idOf(data.account) ?? str(data.id);
      if (!accountId) return;
      const account = await paymentAccountByBachsId(accountId);
      if (account) await refreshSellerPaymentAccount(account);
      return;
    }
    case "payout.created":
    case "payout.processing":
    case "payout.paid":
    case "payout.failed": {
      await handlePayoutWebhook({
        type: event.type === "payout.created" ? "payout.processing" : event.type,
        payoutId:
          str(data.withdrawal_id) ?? str(data.payout_id) ?? str(data.id),
        reference: str(data.reference),
        status: str(data.status),
        failureReason: str(data.failure_reason),
      });
      return;
    }
    case "transfer.created":
    case "transfer.paid":
    case "transfer.failed":
    case "transfer.updated": {
      await handleTransferWebhook({
        type: event.type,
        transferId:
          str(data.transfer_id) ?? str(data.id) ?? idOf(data.transfer),
        reference: str(data.reference),
        status: str(data.status),
        failureReason: str(data.failure_reason),
      });
      return;
    }
    default:
      return;
  }
}

export async function POST(request: Request) {
  try {
    getBachsSettings();
  } catch {
    return NextResponse.json(
      { error: "Webhook signing is not configured." },
      { status: 503 },
    );
  }

  const rawBody = await request.text();
  let event: {
    id: string;
    type: string;
    created_at: string;
    data: Record<string, unknown>;
    organization_id?: string;
    account?: string;
  };
  try {
    event = verifyBachsWebhook(rawBody, request.headers) as typeof event;
  } catch {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  const existing = await withServiceContext(null, (tx) =>
    tx.bachsWebhookEvent.findUnique({ where: { id: event.id } }),
  );
  if (existing?.processed_at) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  if (!existing) {
    await withServiceContext(null, async (tx) => {
      await tx.bachsWebhookEvent.create({
        data: {
          id: event.id,
          type: event.type,
          account_id: event.account ?? event.organization_id ?? null,
          payload: JSON.parse(rawBody) as object,
          event_created_at: dateOf(event.created_at),
        },
      });
    });
  } else {
    await withServiceContext(null, (tx) =>
      tx.bachsWebhookEvent.update({
        where: { id: event.id },
        data: { attempts: { increment: 1 } },
      }),
    );
  }

  try {
    await processEvent({
      id: event.id,
      type: event.type,
      data: event.data ?? {},
      createdAt: event.created_at ?? null,
    });
    await withServiceContext(null, (tx) =>
      tx.bachsWebhookEvent.update({
        where: { id: event.id },
        data: { processed_at: new Date(), error: null },
      }),
    );
    return NextResponse.json({ received: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Webhook processing failed.";
    if (error instanceof OrderNotRetryableError) {
      await withServiceContext(null, (tx) =>
        tx.bachsWebhookEvent.update({
          where: { id: event.id },
          data: { processed_at: new Date(), error: message },
        }),
      );
      return NextResponse.json({
        received: true,
        ignored: true,
        note: "Event recorded but not applied.",
      });
    }
    await withServiceContext(null, (tx) =>
      tx.bachsWebhookEvent.update({
        where: { id: event.id },
        data: { error: message },
      }),
    );
    return NextResponse.json(
      { error: "Webhook processing failed; retry." },
      { status: 500 },
    );
  }
}

"use server";

import { randomBytes, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireUserForAction } from "@/features/auth/authorization";
import { checkAccountCanWrite } from "@/features/accounts/access";
import {
  beginSellerOnboarding,
  getSellerPaymentAccount,
  refreshSellerPaymentAccount,
  sellerCanWithdraw,
} from "@/features/payments/seller-accounts";
import {
  createPayout,
  getBalances,
  listPayoutDestinations,
} from "@/lib/bachs/client";
import { amountToKobo, koboToAmount } from "@/lib/bachs/money";
import { getPrisma } from "@/lib/prisma";
import { withUserContext } from "@/lib/db/context";

export type PaymentActionResult =
  | { ok: true; message?: string; url?: string }
  | { ok: false; error: string };

export async function startPaymentOnboardingAction(): Promise<PaymentActionResult> {
  const user = await requireUserForAction("/seller/settings/payments");
  const access = await checkAccountCanWrite();
  if (!access.ok) return { ok: false, error: access.error };

  try {
    const url = await beginSellerOnboarding(user);
    return { ok: true, url };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not open Bachs onboarding. Please try again.",
    };
  }
}

export async function refreshPaymentAccountAction(): Promise<PaymentActionResult> {
  const user = await requireUserForAction("/seller/settings/payments");
  const account = await getSellerPaymentAccount(user.id);
  if (!account) {
    return { ok: false, error: "Start Bachs onboarding first." };
  }
  try {
    await refreshSellerPaymentAccount(account);
    revalidatePath("/seller/settings/payments");
    return { ok: true, message: "Payment status refreshed." };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not refresh your Bachs account.",
    };
  }
}

export async function syncSellerBalanceAction(): Promise<PaymentActionResult> {
  const user = await requireUserForAction("/seller/settings/payments");
  const account = await getSellerPaymentAccount(user.id);
  if (!account) return { ok: false, error: "Start Bachs onboarding first." };
  try {
    const balances = await getBalances(account.bachs_account_id);
    if (!balances) return { ok: true, message: "No NGN balance yet." };
    await getPrisma().sellerPaymentAccount.update({
      where: { user_id: user.id },
      data: {
        available_balance_kobo: BigInt(balances.availableKobo),
        pending_balance_kobo: BigInt(balances.pendingKobo),
        balance_synced_at: new Date(),
        updated_at: new Date(),
      },
    });
    revalidatePath("/seller/settings/payments");
    return { ok: true, message: "Balance refreshed." };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not read your balance.",
    };
  }
}

export async function requestSellerPayoutAction(
  formData: FormData,
): Promise<PaymentActionResult> {
  const user = await requireUserForAction("/seller/settings/payments");
  const access = await checkAccountCanWrite();
  if (!access.ok) return { ok: false, error: access.error };

  const account = await getSellerPaymentAccount(user.id);
  if (!account) return { ok: false, error: "Start Bachs onboarding first." };
  if (!sellerCanWithdraw(account)) {
    return {
      ok: false,
      error: "Your Bachs payouts capability and bank destination must be active first.",
    };
  }

  let amountKobo: number;
  try {
    amountKobo = amountToKobo(String(formData.get("amount") ?? "").trim());
  } catch {
    return { ok: false, error: "Enter a valid NGN amount." };
  }
  if (amountKobo < 100_00) {
    return { ok: false, error: "The minimum withdrawal is ₦100." };
  }

  let destinationId = String(formData.get("destination_id") ?? "").trim();
  try {
    const destinations = await listPayoutDestinations(account.bachs_account_id);
    const usable = destinations.filter(
      (item) => item.is_usable && (item.currency ?? "NGN") === "NGN",
    );
    if (!destinationId) {
      destinationId =
        usable.find((item) => item.is_default)?.id ?? usable[0]?.id ?? "";
    }
    if (!destinationId || !usable.some((item) => item.id === destinationId)) {
      return {
        ok: false,
        error:
          "No usable NGN bank destination was found. Finish Bachs onboarding first.",
      };
    }
  } catch {
    return {
      ok: false,
      error: "Could not read your Bachs payout destinations. Try again shortly.",
    };
  }

  try {
    const balances = await getBalances(account.bachs_account_id);
    if (balances && amountKobo > balances.availableKobo) {
      return {
        ok: false,
        error: "That is more than your available balance. The ₦50 withdrawal fee is charged on top.",
      };
    }
  } catch {
    // Bachs will still enforce the balance on the payout call.
  }

  const reference = `PAYOUT-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${randomBytes(3).toString("hex").toUpperCase()}`;
  const idempotencyKey = `seller-payout-${randomUUID()}`;
  const payout = await getPrisma().sellerPayout.create({
    data: {
      seller_id: user.id,
      destination_id: destinationId,
      reference,
      idempotency_key: idempotencyKey,
      amount_kobo: BigInt(amountKobo),
      status: "pending",
    },
  });

  try {
    const result = await createPayout({
      accountId: account.bachs_account_id,
      destination: destinationId,
      amount: koboToAmount(amountKobo),
      reference,
      idempotencyKey,
    });
    const status =
      result.status === "completed"
        ? "completed"
        : result.status === "failed"
          ? "failed"
          : "processing";
    await withUserContext(user, (tx) =>
      tx.sellerPayout.update({
        where: { id: payout.id },
        data: {
          bachs_payout_id: result.id,
          fee_kobo: result.fee ? BigInt(amountToKobo(result.fee)) : null,
          total_debited_kobo: result.total_debited
            ? BigInt(amountToKobo(result.total_debited))
            : null,
          status,
          failure_reason: result.failure_reason ?? null,
          updated_at: new Date(),
        },
      }),
    );
    revalidatePath("/seller/settings/payments");
    return {
      ok: true,
      message:
        status === "completed"
          ? "Withdrawal sent to your bank."
          : "Withdrawal submitted. Bachs will confirm when it reaches your bank.",
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Withdrawal could not be created.";
    await getPrisma().sellerPayout.update({
      where: { id: payout.id },
      data: { status: "failed", failure_reason: message, updated_at: new Date() },
    });
    return { ok: false, error: message };
  }
}

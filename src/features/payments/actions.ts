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
  createPayoutDestination,
  deletePayoutDestination,
  getBalances,
  listBanks,
  listPayoutDestinations,
  resolveBankAccount,
  setDefaultPayoutDestination,
} from "@/lib/bachs/client";
import { amountToKobo, koboToAmount } from "@/lib/bachs/money";
import { getPrisma } from "@/lib/prisma";
import { withUserContext } from "@/lib/db/context";
import {
  isSameBankAccount,
  usableNgnDestinations,
} from "@/features/payments/payout-destinations";

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

export async function linkSellerBankAccountAction(
  formData: FormData,
): Promise<PaymentActionResult> {
  const user = await requireUserForAction("/seller/settings/payments");
  const access = await checkAccountCanWrite();
  if (!access.ok) return { ok: false, error: access.error };

  const account = await getSellerPaymentAccount(user.id);
  if (!account) return { ok: false, error: "Start Bachs onboarding first." };

  const accountNumber = String(formData.get("account_number") ?? "").replace(/\s+/g, "");
  const bankCode = String(formData.get("bank_code") ?? "").trim();
  if (!/^\d{10}$/.test(accountNumber)) {
    return { ok: false, error: "Enter the 10-digit account number." };
  }
  if (!bankCode) return { ok: false, error: "Choose your bank." };

  try {
    const banks = await listBanks("NG");
    const bank = banks.find((item) => item.code === bankCode);
    if (!bank) return { ok: false, error: "Choose a bank from the list." };

    const resolved = await resolveBankAccount({ accountNumber, bankCode, country: "NG" });
    const accountName = resolved.account_name?.trim() ?? "";
    if (!resolved.resolved || !accountName) {
      return {
        ok: false,
        error:
          resolved.message?.trim() ||
          "Bachs could not confirm this account. Check the number and bank.",
      };
    }

    // Existing NGN destinations are the seller's previous payout accounts.
    const existing = (await listPayoutDestinations(account.bachs_account_id)).filter(
      (item) => (item.currency ?? "NGN") === "NGN",
    );
    if (
      existing.some(
        (item) => item.is_usable && isSameBankAccount(item, accountNumber, bankCode),
      )
    ) {
      return { ok: false, error: "That is already your payout account." };
    }
    if (existing.length > 0) {
      // Old destinations are removed on switch, so no withdrawal may still be in flight.
      const inFlight = await getPrisma().sellerPayout.count({
        where: { seller_id: user.id, status: { in: ["pending", "processing"] } },
      });
      if (inFlight > 0) {
        return {
          ok: false,
          error: "Wait for your current withdrawal to finish, then switch accounts.",
        };
      }
    }

    const created = await createPayoutDestination({
      accountId: account.bachs_account_id,
      accountNumber,
      accountName,
      bankCode,
      bankName: bank.name,
      idempotencyKey: `seller-bank-${account.bachs_account_id}-${randomUUID()}`,
    });

    const approved = created.is_usable === true || created.status === "approved";
    if (!approved) {
      revalidatePath("/seller/settings/payments");
      return {
        ok: true,
        message: `Saved ${bank.name} account for ${accountName}. Bachs is reviewing it before it can receive withdrawals.`,
      };
    }

    // The new account becomes the one withdrawals use, then the old ones are removed.
    await setDefaultPayoutDestination({
      accountId: account.bachs_account_id,
      destinationId: created.id,
    });
    let oldRemoved = true;
    for (const old of existing) {
      if (old.id === created.id) continue;
      try {
        await deletePayoutDestination({
          accountId: account.bachs_account_id,
          destinationId: old.id,
        });
      } catch (error) {
        oldRemoved = false;
        console.error("Could not remove an old Bachs payout destination.", error);
      }
    }

    // The destination is saved at this point; a failed status refresh is not a link failure.
    await refreshSellerPaymentAccount(account).catch(() => undefined);
    revalidatePath("/seller/settings/payments");
    const removedNote = oldRemoved
      ? ""
      : " Your previous account could not be removed, but withdrawals now go to the new one.";
    return {
      ok: true,
      message: `Linked ${bank.name} account for ${accountName}.${removedNote}`,
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not link your bank account. Try again shortly.",
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

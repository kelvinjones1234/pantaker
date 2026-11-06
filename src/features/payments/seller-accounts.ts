import type { SellerPaymentAccount, User } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/prisma";
import { withUserContext } from "@/lib/db/context";
import {
  createAccountLink,
  createConnectedAccount,
  getConnectedAccount,
  listPayoutDestinations,
  type BachsAccount,
} from "@/lib/bachs/client";
import { publicSiteUrl } from "@/lib/bachs/config";

export interface SellerPaymentStatus {
  account: SellerPaymentAccount | null;
  transfersActive: boolean;
  payoutsActive: boolean;
  onboardingComplete: boolean;
}

function capabilityStatus(account: BachsAccount, key: string): string {
  return account.capabilities?.[key]?.status ?? "unrequested";
}

function onboardingStatusFor(account: BachsAccount): string {
  const transfers = capabilityStatus(account, "transfers");
  const payouts = capabilityStatus(account, "payouts");
  if (transfers === "rejected" || payouts === "rejected") return "rejected";
  if (transfers === "active" && payouts === "active") return "active";
  if (transfers === "restricted" || payouts === "restricted") return "restricted";
  return "pending";
}

function requirementsJson(account: BachsAccount) {
  return account.requirements
    ? (JSON.parse(JSON.stringify(account.requirements)) as object)
    : undefined;
}

export function sellerCanReceivePayments(
  account: Pick<SellerPaymentAccount, "transfers_status"> | null,
): boolean {
  return account?.transfers_status === "active";
}

export function sellerCanWithdraw(
  account: Pick<SellerPaymentAccount, "payouts_status" | "destination_usable"> | null,
): boolean {
  return account?.payouts_status === "active" && account.destination_usable;
}

export async function getSellerPaymentAccount(
  userId: string,
): Promise<SellerPaymentAccount | null> {
  return getPrisma().sellerPaymentAccount.findUnique({
    where: { user_id: userId },
  });
}

export async function ensureSellerPaymentAccount(
  user: Pick<User, "id" | "email" | "name" | "admin_role">,
): Promise<SellerPaymentAccount> {
  const existing = await getSellerPaymentAccount(user.id);
  if (existing) return existing;

  const profile = await getPrisma().profile.findUnique({
    where: { id: user.id },
    select: { display_name: true, username: true },
  });
  const displayName =
    user.name?.trim() ||
    profile?.display_name?.trim() ||
    profile?.username?.trim() ||
    user.email.split("@")[0] ||
    "Pantaker seller";

  const created = await createConnectedAccount({
    email: user.email,
    displayName,
  });

  try {
    return await withUserContext(user, (tx) =>
      tx.sellerPaymentAccount.create({
        data: {
          user_id: user.id,
          bachs_account_id: created.id,
          onboarding_status: onboardingStatusFor(created),
          transfers_status: capabilityStatus(created, "transfers"),
          payouts_status: capabilityStatus(created, "payouts"),
          destination_usable: false,
          requirements: requirementsJson(created),
        },
      }),
    );
  } catch (error) {
    const raced = await getSellerPaymentAccount(user.id);
    if (raced) return raced;
    throw error;
  }
}

export async function refreshSellerPaymentAccount(
  account: Pick<
    SellerPaymentAccount,
    "user_id" | "bachs_account_id" | "transfers_status" | "payouts_status"
  >,
): Promise<SellerPaymentAccount> {
  try {
    const remote = await getConnectedAccount(account.bachs_account_id);
    const transfers = capabilityStatus(remote, "transfers");
    const payouts = capabilityStatus(remote, "payouts");
    let destinationUsable = false;
    if (payouts === "active") {
      try {
        const destinations = await listPayoutDestinations(account.bachs_account_id);
        destinationUsable = destinations.some(
          (item) => item.is_usable && (item.currency ?? "NGN") === "NGN",
        );
      } catch {
        destinationUsable = false;
      }
    }
    return await getPrisma().sellerPaymentAccount.update({
      where: { user_id: account.user_id },
      data: {
        onboarding_status: onboardingStatusFor(remote),
        transfers_status: transfers,
        payouts_status: payouts,
        destination_usable: destinationUsable,
        requirements: requirementsJson(remote),
        last_error: null,
        updated_at: new Date(),
      },
    });
  } catch (error) {
    await getPrisma().sellerPaymentAccount.update({
      where: { user_id: account.user_id },
      data: {
        last_error: error instanceof Error ? error.message : "Could not refresh Bachs account.",
        updated_at: new Date(),
      },
    });
    throw error;
  }
}

export async function beginSellerOnboarding(
  user: Pick<User, "id" | "email" | "name" | "admin_role">,
): Promise<string> {
  const account = await ensureSellerPaymentAccount(user);
  const site = publicSiteUrl();
  const link = await createAccountLink({
    accountId: account.bachs_account_id,
    refreshUrl: `${site}/seller/settings/payments?refresh=1`,
    returnUrl: `${site}/seller/settings/payments?returned=1`,
  });
  return link.url;
}

/** Re-read capability state in the background of a settings page render. */
export async function loadSellerPaymentStatus(
  userId: string,
): Promise<SellerPaymentStatus> {
  let account = await getSellerPaymentAccount(userId);
  if (account) {
    try {
      account = await refreshSellerPaymentAccount(account);
    } catch {
      // Keep the last known state; the page shows it as stale.
    }
  }
  return {
    account,
    transfersActive: account?.transfers_status === "active",
    payoutsActive: account?.payouts_status === "active",
    onboardingComplete: sellerCanReceivePayments(account),
  };
}

export function paymentAccountByBachsId(accountId: string) {
  return getPrisma().sellerPaymentAccount.findUnique({
    where: { bachs_account_id: accountId },
  });
}

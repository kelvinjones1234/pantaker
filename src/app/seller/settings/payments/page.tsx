import type { Metadata } from "next";
import { requireSeller } from "@/features/auth/authorization";
import { isBachsConfigured } from "@/lib/bachs/config";
import { formatKobo } from "@/lib/bachs/money";
import { loadSellerPaymentStatus } from "@/features/payments/seller-accounts";
import {
  getSellerPayouts,
  loadSellerDestinations,
} from "@/features/payments/payouts";
import { SettingsCard, SettingsRow } from "@/components/seller/SettingsCard";
import { SellerPageHeader } from "@/components/seller/SellerPageHeader";
import {
  PayoutForm,
  RefreshPaymentStatusButton,
  StartOnboardingButton,
} from "@/components/seller/PaymentsPanel";
import { formatAdminDateTime } from "@/lib/datetime";

export const metadata: Metadata = { title: "Payments — Pantaker" };

function statusLabel(value: string): string {
  if (value === "active") return "Active";
  if (value === "restricted") return "Action needed";
  if (value === "rejected") return "Rejected";
  if (value === "pending") return "In review";
  return "Not started";
}

export default async function PaymentSettingsPage() {
  const user = await requireSeller("/seller/settings/payments");
  const configured = isBachsConfigured();
  const status = configured && user ? await loadSellerPaymentStatus(user.id) : null;
  const account = status?.account ?? null;
  const [destinations, payouts] = await Promise.all([
    account && configured
      ? loadSellerDestinations(account.bachs_account_id)
      : Promise.resolve([]),
    user ? getSellerPayouts(user.id) : Promise.resolve([]),
  ]);
  const usableDestinations = destinations.filter(
    (item) => item.is_usable && (item.currency ?? "NGN") === "NGN",
  );

  return (
    <div className="flex flex-col gap-6">
      <SellerPageHeader
        title="Payments"
        description="Pantaker holds buyer payments until handover, then pays your share to your Bachs balance. Bachs handles identity checks and bank payouts."
      />

      {!configured && (
        <div className="rounded-[20px] bg-[var(--color-warning-bg)] p-5 text-[13px] leading-relaxed text-[var(--color-warning)]">
          Online payments are not configured on this environment yet. Add the
          Bachs keys to the server environment to enable checkout and payouts.
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="flex flex-col gap-5">
          <SettingsCard
            title="Bachs account"
            description="Bachs verifies sellers and sends withdrawals to your Nigerian bank account."
          >
            {account ? (
              <>
                <SettingsRow
                  label="Onboarding"
                  value={statusLabel(account.onboarding_status)}
                  note={
                    account.onboarding_status === "active"
                      ? "You can receive online payments."
                      : "Finish onboarding or provide any missing details in Bachs."
                  }
                />
                <SettingsRow
                  label="Receiving payments"
                  value={statusLabel(account.transfers_status)}
                />
                <SettingsRow
                  label="Bank payouts"
                  value={statusLabel(account.payouts_status)}
                />
                <SettingsRow
                  label="Bank account"
                  value={
                    usableDestinations.length > 0
                      ? `${usableDestinations[0].bank_name ?? "Bank"} · ${usableDestinations[0].account_number_last4 ? `••••${usableDestinations[0].account_number_last4}` : "linked"}`
                      : "Not linked yet"
                  }
                />
                {account.last_error && (
                  <p className="mt-3 text-[12px] leading-relaxed text-[var(--color-error)]">
                    Last check failed: {account.last_error}
                  </p>
                )}
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  {account.onboarding_status !== "active" && (
                    <StartOnboardingButton
                      label={
                        account.onboarding_status === "pending"
                          ? "Continue Bachs onboarding"
                          : "Open Bachs onboarding"
                      }
                    />
                  )}
                  <RefreshPaymentStatusButton />
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-[13px] leading-relaxed text-[var(--color-ink-black)]">
                  Start Bachs onboarding to receive online payments. It usually
                  takes a few minutes, and you can keep listing while it is reviewed.
                </p>
                {configured && <StartOnboardingButton />}
              </div>
            )}
          </SettingsCard>

          {account && (
            <SettingsCard
              title="Withdrawals"
              description="Move your available balance to your bank. Payouts are separate from buyer-protected order money."
            >
              <PayoutForm
                availableKobo={Number(account.available_balance_kobo)}
                destinations={usableDestinations}
                canWithdraw={
                  account.payouts_status === "active" && usableDestinations.length > 0
                }
              />
            </SettingsCard>
          )}

          {payouts.length > 0 && (
            <SettingsCard title="Recent withdrawals">
              <ul className="flex flex-col divide-y divide-[var(--color-faint-border)]">
                {payouts.map((payout) => (
                  <li
                    key={payout.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
                  >
                    <div>
                      <p className="text-[13px] font-semibold text-[var(--color-ink-black)]">
                        {formatKobo(payout.amount_kobo)}
                      </p>
                      <p className="text-[11px] text-[var(--color-ash-veil)]">
                        {payout.reference} · {formatAdminDateTime(payout.created_at)}
                      </p>
                      {payout.failure_reason && (
                        <p className="mt-1 text-[11px] text-[var(--color-error)]">
                          {payout.failure_reason}
                        </p>
                      )}
                    </div>
                    <span className="rounded-full bg-[var(--color-canvas-mist)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-ash-veil)] capitalize">
                      {payout.status}
                    </span>
                  </li>
                ))}
              </ul>
            </SettingsCard>
          )}
        </div>

        <div className="flex flex-col gap-5">
          <SettingsCard title="Buyer protection">
            <SettingsRow
              label="Available balance"
              value={formatKobo(Number(account?.available_balance_kobo ?? 0))}
            />
            <SettingsRow
              label="Pending balance"
              value={formatKobo(Number(account?.pending_balance_kobo ?? 0))}
            />
            <SettingsRow label="Commission" value="5% per sale" />
          </SettingsCard>

          <div className="rounded-[20px] bg-[var(--color-canvas-mist)] p-5 text-[12px] leading-relaxed text-[var(--color-ash-veil)]">
            <p className="font-semibold text-[var(--color-ink-black)]">
              How payouts work
            </p>
            <p className="mt-2">
              A buyer pays Pantaker. The money is held until you confirm handover
              with their pickup code, then released after the 72-hour protection
              window unless the buyer confirms sooner or raises a problem.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

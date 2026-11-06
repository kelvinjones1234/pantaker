import { BachsApiError } from "@bachs/sdk";
import { bachsApiBaseUrl, getBachsSettings } from "@/lib/bachs/config";
import { amountToKobo } from "@/lib/bachs/money";

export class BachsRestError extends Error {
  readonly status: number;
  readonly code: string | null;
  readonly detail: string;

  constructor(status: number, code: string | null, detail: string) {
    super(detail);
    this.name = "BachsRestError";
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

interface BachsRequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  accountId?: string | null;
  idempotencyKey?: string | null;
}

export interface BachsAccount {
  id: string;
  name?: string | null;
  country?: string | null;
  is_active?: boolean;
  capabilities?: Record<
    string,
    { status?: string; requested?: boolean; status_details?: unknown }
  >;
  requirements?: {
    currently_due?: string[];
    eventually_due?: string[];
    past_due?: string[];
    pending_verification?: string[];
    errors?: unknown[];
  };
}

export interface BachsAccountLink {
  id: string;
  url: string;
  expires_at: string;
}

export interface BachsTransfer {
  id: string;
  source: string;
  destination: string;
  amount: string;
  currency: string;
  status: "pending" | "paid";
}

export interface BachsRefund {
  refund_id: string;
  charge_id: string;
  reference: string;
  status: string;
  requested_amount?: string | null;
  refunded_amount?: string | null;
}

export interface BachsPayoutDestination {
  id: string;
  type?: string;
  currency?: string;
  is_usable?: boolean;
  is_default?: boolean;
  bank_name?: string | null;
  account_name?: string | null;
  account_number_last4?: string | null;
}

export interface BachsPayout {
  id: string;
  status: string;
  amount: string;
  currency: string;
  fee?: string | null;
  total_debited?: string | null;
  destination?: string | null;
  reference?: string | null;
  failure_reason?: string | null;
}

interface BachsBalanceRow {
  currency?: string;
  available_balance?: string;
  pending_balance?: string;
}

interface BachsBalanceResponse {
  account_id?: string;
  balances?: BachsBalanceRow[];
}

async function request<T>(
  path: string,
  options: BachsRequestOptions = {},
): Promise<T> {
  const { secretKey } = getBachsSettings();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${secretKey}`,
    Accept: "application/json",
  };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.accountId) headers["X-Account-Id"] = options.accountId;
  if (options.idempotencyKey) {
    headers["Idempotency-Key"] = options.idempotencyKey;
  }

  let response: Response;
  try {
    response = await fetch(`${bachsApiBaseUrl()}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    throw new BachsRestError(
      503,
      "NETWORK_ERROR",
      "Bachs could not be reached. Try again shortly.",
    );
  }

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text) as unknown;
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const error = (payload ?? {}) as {
      detail?: unknown;
      error_code?: unknown;
    };
    const detail =
      typeof error.detail === "string" && error.detail.trim()
        ? error.detail
        : "Bachs rejected the request.";
    const code =
      typeof error.error_code === "string" ? error.error_code : null;
    throw new BachsRestError(response.status, code, detail);
  }

  return payload as T;
}

export async function createConnectedAccount(input: {
  email: string;
  displayName: string;
}): Promise<BachsAccount> {
  return request<BachsAccount>("/v1/accounts", {
    method: "POST",
    body: {
      contact_email: input.email,
      display_name: input.displayName,
      country: "NG",
      entity_type: "individual",
      configuration: {
        recipient: {
          capabilities: {
            transfers: { requested: true },
            payouts: { requested: true },
          },
        },
      },
      balance_currencies: { NGN: true },
    },
  });
}

export async function getConnectedAccount(
  accountId: string,
): Promise<BachsAccount> {
  return request<BachsAccount>(`/v1/accounts/${encodeURIComponent(accountId)}`);
}

export async function createAccountLink(input: {
  accountId: string;
  refreshUrl: string;
  returnUrl: string;
}): Promise<BachsAccountLink> {
  return request<BachsAccountLink>(
    `/v1/accounts/${encodeURIComponent(input.accountId)}/account-links`,
    {
      method: "POST",
      body: {
        type: "onboarding",
        refresh_url: input.refreshUrl,
        return_url: input.returnUrl,
      },
    },
  );
}

export async function createTransfer(input: {
  destination: string;
  amount: string;
  currency?: string;
  description?: string;
  metadata?: Record<string, string>;
  transferGroup?: string;
  accountId?: string;
  idempotencyKey: string;
}): Promise<BachsTransfer> {
  return request<BachsTransfer>("/v1/transfers", {
    method: "POST",
    accountId: input.accountId ?? null,
    idempotencyKey: input.idempotencyKey,
    body: {
      destination: input.destination,
      amount: input.amount,
      currency: input.currency ?? "NGN",
      description: input.description ?? null,
      metadata: input.metadata ?? null,
      transfer_group: input.transferGroup ?? null,
    },
  });
}

export async function getTransfer(
  transferId: string,
  accountId?: string | null,
): Promise<BachsTransfer> {
  return request<BachsTransfer>(
    `/v1/transfers/${encodeURIComponent(transferId)}`,
    { accountId: accountId ?? null },
  );
}

export async function createRefund(input: {
  chargeId: string;
  amount: string;
  reference: string;
  reason: string;
  idempotencyKey: string;
}): Promise<BachsRefund> {
  return request<BachsRefund>("/v1/refunds", {
    method: "POST",
    idempotencyKey: input.idempotencyKey,
    body: {
      charge_id: input.chargeId,
      amount: input.amount,
      reference: input.reference,
      reason: input.reason,
    },
  });
}

export async function listPayoutDestinations(
  accountId: string,
): Promise<BachsPayoutDestination[]> {
  const response = await request<{
    items?: BachsPayoutDestination[];
    data?: BachsPayoutDestination[];
  }>("/v1/payouts/destinations", { accountId });
  return response.items ?? response.data ?? [];
}

export async function createPayout(input: {
  accountId: string;
  destination: string;
  amount: string;
  reference: string;
  idempotencyKey: string;
}): Promise<BachsPayout> {
  return request<BachsPayout>("/v1/payouts", {
    method: "POST",
    accountId: input.accountId,
    idempotencyKey: input.idempotencyKey,
    body: {
      destination: input.destination,
      amount: input.amount,
      reference: input.reference,
    },
  });
}

export async function getBalances(
  accountId: string,
): Promise<{ availableKobo: number; pendingKobo: number } | null> {
  const response = await request<BachsBalanceResponse>("/v1/balances", {
    accountId,
  });
  const row = response.balances?.find((item) => item.currency === "NGN");
  if (!row) return null;
  return {
    availableKobo: amountToKobo(row.available_balance ?? "0.00"),
    pendingKobo: amountToKobo(row.pending_balance ?? "0.00"),
  };
}

export function isBachsApiError(error: unknown): error is BachsApiError {
  return error instanceof BachsApiError;
}

export function bachsErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof BachsRestError) return error.detail;
  if (error instanceof BachsApiError) return error.message;
  return fallback;
}

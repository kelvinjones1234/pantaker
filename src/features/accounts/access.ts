import { cache } from "react";
import { getAuthUser } from "@/features/auth/queries";
import { getPrisma, isPrismaConfigured } from "@/lib/prisma";

export type AccountAccessStatus = "active" | "restricted" | "suspended";

export interface AccountAccessState {
  status: AccountAccessStatus;
  endsAt: string | null;
}

export type AccountAccessResult =
  | AccountAccessState
  | { status: "unknown"; error: string };

const VERIFY_ERROR =
  "We couldn't verify your account access just now. Please try again.";

export async function loadAccountAccessState(): Promise<AccountAccessResult> {
  if (!isPrismaConfigured()) {
    return { status: "active", endsAt: null };
  }

  try {
    const user = await getAuthUser();
    if (!user) return { status: "active", endsAt: null };

    const restriction = await getPrisma().accountRestriction.findUnique({
      where: { user_id: user.id },
      select: { status: true, ends_at: true },
    });

    if (restriction?.status === "restricted") {
      return {
        status: "restricted",
        endsAt: restriction.ends_at?.toISOString() ?? null,
      };
    }
    if (restriction?.status === "suspended") {
      return {
        status: "suspended",
        endsAt: restriction.ends_at?.toISOString() ?? null,
      };
    }
    return { status: "active", endsAt: null };
  } catch {
    return { status: "unknown", error: VERIFY_ERROR };
  }
}

export const getAccountAccessState = cache(loadAccountAccessState);

export type AccountWriteCheck = { ok: true } | { ok: false; error: string };

export function evaluateAccountWriteAccess(state: AccountAccessResult): AccountWriteCheck {
  if (state.status === "active") return { ok: true };
  if (state.status === "restricted") {
    return {
      ok: false,
      error:
        "Your account is restricted. You can browse and read, but you cannot list items, send messages, or record sales while the restriction is active.",
    };
  }
  if (state.status === "suspended") {
    return {
      ok: false,
      error:
        "Your account is suspended. Contact Pantaker staff if you think this is a mistake.",
    };
  }
  if (state.status === "unknown") return { ok: false, error: state.error };
  return { ok: false, error: VERIFY_ERROR };
}

export async function checkAccountCanWrite(): Promise<AccountWriteCheck> {
  return evaluateAccountWriteAccess(await getAccountAccessState());
}

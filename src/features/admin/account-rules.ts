import type { AdminRole } from "@/features/admin/roles";

export const ACCOUNT_DISPLAY_STATUSES = ["active", "restricted", "suspended"] as const;
export const ACCOUNT_RESTRICTION_STATUSES = ["restricted", "suspended"] as const;

export type AccountRestrictionStatus = (typeof ACCOUNT_RESTRICTION_STATUSES)[number];
export type AccountDisplayStatus = (typeof ACCOUNT_DISPLAY_STATUSES)[number];

export interface AccountRestrictionRecord {
  user_id: string;
  status: AccountRestrictionStatus;
  reason: string;
  starts_at: string;
  ends_at: string | null;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
}

export interface AccountDirectoryUser {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  banned_until: string | null;
  role: AdminRole | null;
}

export interface AdminAccountRow {
  id: string;
  email: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  status: AccountDisplayStatus;
  restriction: AccountRestrictionRecord | null;
  legacyBannedUntil: string | null;
  responsibleAdmin: { id: string; email: string | null } | null;
  role: AdminRole | null;
}

export type RuleResult = { ok: true } | { ok: false; error: string };

export const ACCOUNT_STATUS_LABELS: Record<AccountDisplayStatus, string> = {
  active: "Active",
  restricted: "Restricted",
  suspended: "Suspended",
};

export function isAccountBanned(
  bannedUntil: string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!bannedUntil) return false;
  const time = new Date(bannedUntil).getTime();
  return Number.isFinite(time) && time > now.getTime();
}

export function resolveAccountStatus(
  restriction: AccountRestrictionRecord | null,
  bannedUntil: string | null | undefined,
  now: Date = new Date(),
): AccountDisplayStatus {
  if (restriction?.status === "suspended") return "suspended";
  if (isAccountBanned(bannedUntil, now)) return "suspended";
  if (restriction?.status === "restricted") return "restricted";
  return "active";
}

export function accountStatusTone(
  status: AccountDisplayStatus,
): "neutral" | "warning" | "danger" {
  if (status === "suspended") return "danger";
  if (status === "restricted") return "warning";
  return "neutral";
}

export function accountStatusDescription(status: AccountDisplayStatus): string {
  if (status === "suspended") return "Cannot sign in or use the account.";
  if (status === "restricted") return "Can sign in and read, but cannot transact.";
  return "No restriction on the account.";
}

export function buildAccountRows(
  users: AccountDirectoryUser[],
  restrictions: AccountRestrictionRecord[],
  now: Date = new Date(),
): AdminAccountRow[] {
  const byId = new Map(users.map((user) => [user.id, user]));
  const restrictionByUser = new Map(restrictions.map((row) => [row.user_id, row]));

  const rows = users.map((user) => {
    const restriction = restrictionByUser.get(user.id) ?? null;
    const responsible = restriction ? byId.get(restriction.updated_by) : undefined;
    return {
      id: user.id,
      email: user.email,
      createdAt: user.created_at,
      lastSignInAt: user.last_sign_in_at,
      status: resolveAccountStatus(restriction, user.banned_until, now),
      restriction,
      legacyBannedUntil:
        !restriction && isAccountBanned(user.banned_until, now)
          ? user.banned_until
          : null,
      responsibleAdmin: restriction
        ? { id: restriction.updated_by, email: responsible?.email ?? null }
        : null,
      role: user.role,
    } satisfies AdminAccountRow;
  });

  const order: Record<AccountDisplayStatus, number> = {
    suspended: 0,
    restricted: 1,
    active: 2,
  };

  return rows.sort((a, b) => {
    const byStatus = order[a.status] - order[b.status];
    if (byStatus !== 0) return byStatus;
    return (a.email ?? a.id).localeCompare(b.email ?? b.id, "en", { sensitivity: "base" });
  });
}

export function filterAccountRows(
  rows: AdminAccountRow[],
  input: { q: string; status: AccountDisplayStatus | "" },
): AdminAccountRow[] {
  const term = input.q.trim().toLowerCase();
  return rows.filter((row) => {
    if (input.status && row.status !== input.status) return false;
    if (!term) return true;
    return (
      (row.email ?? "").toLowerCase().includes(term) ||
      row.id.toLowerCase().includes(term)
    );
  });
}

export function countAccountStatuses(rows: AdminAccountRow[]): Record<
  AccountDisplayStatus | "all",
  number
> {
  const counts: Record<AccountDisplayStatus | "all", number> = {
    all: rows.length,
    active: 0,
    restricted: 0,
    suspended: 0,
  };
  for (const row of rows) counts[row.status] += 1;
  return counts;
}

export function paginateAccountRows(
  rows: AdminAccountRow[],
  page: number,
  pageSize: number,
): AdminAccountRow[] {
  const start = Math.max(0, (page - 1) * pageSize);
  return rows.slice(start, start + pageSize);
}

export function evaluateAccountStatusChange(input: {
  actorId: string;
  targetId: string;
  targetRole: AdminRole | null;
  status: AccountDisplayStatus;
  otherSuperAdmins: number;
}): RuleResult {
  if (input.actorId === input.targetId) {
    return { ok: false, error: "You cannot change your own account status." };
  }

  if (
    input.status !== "active" &&
    input.targetRole === "super_admin" &&
    input.otherSuperAdmins === 0
  ) {
    return {
      ok: false,
      error: "Pantaker needs at least one super admin. Promote another account first.",
    };
  }

  return { ok: true };
}

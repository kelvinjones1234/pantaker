import { ADMIN_PAGE_SIZE } from "@/features/admin/list-params";
import { getAdminRole } from "@/features/admin/roles";
import {
  buildAccountRows,
  countAccountStatuses,
  filterAccountRows,
  paginateAccountRows,
  type AccountDirectoryUser,
  type AccountDisplayStatus,
  type AccountRestrictionRecord,
  type AdminAccountRow,
} from "@/features/admin/account-rules";
import { getPrisma, isPrismaConfigured } from "@/lib/prisma";
import { withUserContext } from "@/lib/db/context";
import type { User } from "@/generated/prisma/client";

const SERVICE_ROLE_ERROR =
  "The account directory needs database configuration.";

export class AccountStorageError extends Error {
  readonly code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "AccountStorageError";
    this.code = code;
  }
}

export async function readAccountDirectory(): Promise<
  Map<string, AccountDirectoryUser>
> {
  const directory = new Map<string, AccountDirectoryUser>();

  const users = await getPrisma().user.findMany({
    select: { id: true, email: true, created_at: true, admin_role: true },
  });

  for (const user of users) {
    directory.set(user.id, {
      id: user.id,
      email: user.email ?? null,
      created_at: user.created_at.toISOString(),
      last_sign_in_at: null,
      banned_until: null,
      role: getAdminRole(user),
    });
  }

  return directory;
}

export async function fetchAccountRestrictions(): Promise<
  AccountRestrictionRecord[]
> {
  const rows = await getPrisma().accountRestriction.findMany({
    orderBy: { updated_at: "desc" },
  });

  return rows.map((row) => ({
    user_id: row.user_id,
    status: row.status as AccountRestrictionRecord["status"],
    reason: row.reason,
    starts_at: row.starts_at.toISOString(),
    ends_at: row.ends_at?.toISOString() ?? null,
    created_by: row.created_by,
    updated_by: row.updated_by,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  }));
}

export async function setAccountStatusRpc(input: {
  actor: Pick<User, "id" | "admin_role">;
  userId: string;
  status: AccountDisplayStatus;
  reason: string;
}): Promise<void> {
  try {
    await withUserContext(input.actor, async (tx) => {
      await tx.$executeRaw`select public.admin_set_account_status(${input.userId}::uuid, ${input.status}, ${input.reason})`;
      if (input.status === "suspended") {
        await tx.user.update({
          where: { id: input.userId },
          data: { session_version: { increment: 1 } },
        });
      }
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Account update failed.";
    throw new AccountStorageError(message, "ACCOUNT_UPDATE_FAILED");
  }
}

export type AdminAccountsResult =
  | {
      ok: true;
      rows: AdminAccountRow[];
      counts: Record<AccountDisplayStatus | "all", number>;
      total: number;
      page: number;
      pageSize: number;
    }
  | { ok: false; error: string };

export async function loadAdminAccounts(input: {
  q: string;
  status: AccountDisplayStatus | "";
  page: number;
  now?: Date;
}): Promise<AdminAccountsResult> {
  if (!isPrismaConfigured()) {
    return { ok: false, error: SERVICE_ROLE_ERROR };
  }

  try {
    const [directory, restrictions] = await Promise.all([
      readAccountDirectory(),
      fetchAccountRestrictions(),
    ]);

    const allRows = buildAccountRows(
      [...directory.values()],
      restrictions,
      input.now ?? new Date(),
    );
    const searched = filterAccountRows(allRows, { q: input.q, status: "" });
    const filtered = filterAccountRows(allRows, {
      q: input.q,
      status: input.status,
    });

    return {
      ok: true,
      rows: paginateAccountRows(filtered, input.page, ADMIN_PAGE_SIZE),
      counts: countAccountStatuses(searched),
      total: filtered.length,
      page: input.page,
      pageSize: ADMIN_PAGE_SIZE,
    };
  } catch (error) {
    if (error instanceof AccountStorageError) {
      return { ok: false, error: error.message };
    }
    return {
      ok: false,
      error: "Could not load the account directory. Please try again.",
    };
  }
}

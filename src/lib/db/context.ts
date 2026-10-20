import type { Prisma, User } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/prisma";

export type TransactionClient = Prisma.TransactionClient;

/**
 * Run a write transaction with the signed-in actor visible to database triggers.
 * The settings are transaction-local, so pooled connections cannot leak one
 * request's identity into another.
 */
export async function withUserContext<T>(
  user: Pick<User, "id" | "admin_role">,
  work: (tx: TransactionClient) => Promise<T>,
): Promise<T> {
  return getPrisma().$transaction(async (tx) => {
    await tx.$executeRaw`select set_config('app.user_id', ${user.id}, true)`;
    await tx.$executeRaw`select set_config('app.user_role', ${user.admin_role ?? ""}, true)`;
    await tx.$executeRaw`select set_config('app.is_service', 'false', true)`;
    return work(tx);
  });
}

/**
 * Trusted system operations (account deletion, moderation, notification emit)
 * run with service context. `actorId` is still recorded for audit purposes when
 * present.
 */
export async function withServiceContext<T>(
  actorId: string | null,
  work: (tx: TransactionClient) => Promise<T>,
): Promise<T> {
  return getPrisma().$transaction(async (tx) => {
    await tx.$executeRaw`select set_config('app.user_id', ${actorId ?? ""}, true)`;
    await tx.$executeRaw`select set_config('app.user_role', '', true)`;
    await tx.$executeRaw`select set_config('app.is_service', 'true', true)`;
    return work(tx);
  });
}

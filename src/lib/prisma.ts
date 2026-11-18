import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Prisma owns the auth-facing `Profile` model (see prisma/schema.prisma).
 * Auth identity lives in public.users. The connection here is a server-only
 * direct Postgres connection and bypasses Row Level Security.
 *
 * Instantiated lazily so importing modules never throw when DATABASE_URL is
 * absent (local preview runs without a database configured).
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Add your Postgres connection string to .env.",
    );
  }
  // Each serverless instance owns its own pool. Keep it small so many warm
  // instances don't exhaust the Supabase pooler's client limit (EMAXCONNSESSION).
  // Use the transaction pooler (port 6543) for DATABASE_URL on Vercel.
  const adapter = new PrismaPg({
    connectionString,
    max: Number(process.env.DATABASE_POOL_MAX ?? 1),
    idleTimeoutMillis: 10_000,
  });
  return new PrismaClient({ adapter });
}

export function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

export function isPrismaConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

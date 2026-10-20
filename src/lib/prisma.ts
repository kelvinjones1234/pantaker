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
  const adapter = new PrismaPg({ connectionString });
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

import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

// Next.js reads .env.local; load it first so the CLI matches the app.
loadEnv({ path: [".env.local", ".env"] });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Prefer the direct (non-pooled) host for schema changes/migrations.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  },
});

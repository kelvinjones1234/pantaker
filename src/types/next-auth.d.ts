import type { DefaultSession } from "next-auth";
import type { AdminRole } from "@/generated/prisma/enums";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      session_version: number;
    } & DefaultSession["user"];
  }

  interface User {
    admin_role?: AdminRole | null;
    session_version: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    session_version?: number;
  }
}

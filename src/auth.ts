import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import {
  isSixDigitCode,
  isValidEmail,
  normalizeEmail,
  verifyLoginCode,
} from "@/lib/auth/otp";
import { getPrisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Credentials({
      name: "Email code",
      credentials: {
        email: { label: "Email", type: "email" },
        token: { label: "Code", type: "text" },
      },
      async authorize(credentials) {
        const email =
          typeof credentials?.email === "string"
            ? normalizeEmail(credentials.email)
            : "";
        const token =
          typeof credentials?.token === "string"
            ? credentials.token.trim()
            : "";

        if (!isValidEmail(email) || !isSixDigitCode(token)) return null;

        const result = await verifyLoginCode(email, token);
        if (!result.ok) return null;

        const restriction = await getPrisma().accountRestriction.findUnique({
          where: { user_id: result.user.id },
          select: { status: true },
        });
        if (restriction?.status === "suspended") return null;

        return {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          image: result.user.image,
          admin_role: result.user.admin_role,
          session_version: result.user.session_version,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.session_version = user.session_version;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.session_version =
          typeof token.session_version === "number" ? token.session_version : 1;
      }
      return session;
    },
  },
});

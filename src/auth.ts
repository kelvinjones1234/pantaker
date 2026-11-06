import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { isSixDigitCode, isValidEmail, normalizeEmail, verifySignupCode } from "@/lib/auth/otp";
import { verifyPassword } from "@/lib/auth/password";
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
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        token: { label: "Code", type: "text" },
      },
      async authorize(credentials) {
        const email =
          typeof credentials?.email === "string"
            ? normalizeEmail(credentials.email)
            : "";
        const password =
          typeof credentials?.password === "string" ? credentials.password : "";
        const token =
          typeof credentials?.token === "string"
            ? credentials.token.trim()
            : "";

        if (!isValidEmail(email)) return null;

        let account;
        if (token) {
          // Sign-up: the emailed code creates the account with its password.
          if (!isSixDigitCode(token)) return null;
          const result = await verifySignupCode(email, token);
          if (!result.ok) return null;
          account = result.user;
        } else {
          // Sign-in: email + password only.
          if (!password) return null;
          const user = await getPrisma().user.findUnique({ where: { email } });
          if (!user?.password_hash) return null;
          if (!(await verifyPassword(password, user.password_hash))) return null;
          account = user;
        }

        const restriction = await getPrisma().accountRestriction.findUnique({
          where: { user_id: account.id },
          select: { status: true },
        });
        if (restriction?.status === "suspended") return null;

        return {
          id: account.id,
          email: account.email,
          name: account.name,
          image: account.image,
          admin_role: account.admin_role,
          session_version: account.session_version,
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

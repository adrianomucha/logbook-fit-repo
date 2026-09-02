import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/lib/prisma";
import { isLockedDemoAccount } from "@/lib/demo";
import { verifyCredentials } from "@/lib/credentials";
import { verifySwitchToken } from "@/lib/switch-token";
import { reportEnvProblemsOnce } from "@/lib/env-check";
import {
  LOGIN_ERROR_DEMO_LOCKED,
  LOGIN_ERROR_RATE_LIMITED,
} from "@/lib/auth-errors";

// Nearly every server route imports this module, so a cold start is the
// closest thing to "boot" a serverless deploy has — log missing env here.
reportEnvProblemsOnce();

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        // Same check as POST /api/auth/mobile/login (lib/credentials.ts).
        // Refusals the login page may name are thrown (not null) so
        // `signIn(..., { redirect: false })` surfaces them as `result.error`;
        // everything else stays a generic null.
        const ip =
          (req?.headers && "x-forwarded-for" in req.headers
            ? (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim()
            : undefined) ?? "unknown";
        const check = await verifyCredentials({
          email: credentials?.email,
          password: credentials?.password,
          ip,
        });
        if (check.ok) return check.user;
        if (check.reason === "demo_locked") throw new Error(LOGIN_ERROR_DEMO_LOCKED);
        if (check.reason === "rate_limited") throw new Error(LOGIN_ERROR_RATE_LIMITED);
        return null;
      },
    }),
    // Linked-account switch: redeems the short-lived token minted by
    // POST /api/account/switch. The token — obtainable only from a live
    // session of the paired account — is the whole credential; no password
    // crosses the wire and the demo lock still applies to the target.
    CredentialsProvider({
      id: "account-switch",
      name: "account-switch",
      credentials: {
        token: { label: "Token", type: "text" },
      },
      async authorize(credentials) {
        try {
          const userId = verifySwitchToken(credentials?.token);
          if (!userId) {
            console.error("[AUTH] Invalid or expired account-switch token");
            return null;
          }

          const user = await prisma.user.findFirst({
            where: { id: userId, deletedAt: null },
          });
          if (!user || isLockedDemoAccount(user.email)) {
            console.error("[AUTH] Account-switch target unavailable:", userId);
            return null;
          }

          console.log("[AUTH] Account switch successful for user:", user.id);
          return {
            id: user.id,
            email: user.email,
            role: user.role,
            name: user.name,
          };
        } catch (error) {
          console.error("[AUTH] Error in account-switch authorize:", error);
          return null;
        }
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 }, // 30 days
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: string }).role;
        token.userId = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string;
        session.user.id = token.userId as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};

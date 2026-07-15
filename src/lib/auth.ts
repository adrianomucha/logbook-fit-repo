import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { loginLimiter } from "@/lib/rate-limit";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        try {
          if (!credentials?.email || !credentials?.password) {
            console.error("[AUTH] Missing credentials");
            return null;
          }

          const email = credentials.email.trim().toLowerCase();

          // Rate limit by IP + email to prevent brute-force
          const ip =
            (req?.headers && "x-forwarded-for" in req.headers
              ? (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim()
              : undefined) ?? "unknown";
          // Log user ids rather than emails — emails are PII and login
          // attempts (including attacker probes) shouldn't put them in logs.
          const { allowed } = loginLimiter(`${ip}:${email}`);
          if (!allowed) {
            console.error("[AUTH] Rate limited login attempt");
            return null;
          }

          const user = await prisma.user.findFirst({
            where: { email, deletedAt: null },
          });

          if (!user) {
            console.error("[AUTH] Login attempt for unknown email");
            return null;
          }

          const passwordMatch = await bcrypt.compare(credentials.password, user.passwordHash);
          if (!passwordMatch) {
            console.error("[AUTH] Password mismatch for user:", user.id);
            return null;
          }

          console.log("[AUTH] Login successful for user:", user.id);
          return {
            id: user.id,
            email: user.email,
            role: user.role,
            name: user.name,
          };
        } catch (error) {
          console.error("[AUTH] Error in authorize:", error);
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

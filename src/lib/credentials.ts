import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { loginLimiter } from "@/lib/rate-limit";
import { isLockedDemoAccount } from "@/lib/demo";

/**
 * The one email + password check, shared by the NextAuth credentials
 * provider (web, cookie session) and POST /api/auth/mobile/login (native
 * app, bearer token). Both sign-in paths must refuse exactly the same
 * things — demo lock, rate limit, unknown email, wrong password, soft-deleted
 * account — and they can only stay in agreement by running the same code.
 *
 * "invalid" is deliberately one reason for both unknown-email and
 * wrong-password so neither sign-in path can be used to probe which
 * addresses have accounts. The other two reasons carry no account
 * information and are safe to show verbatim.
 */
export type CredentialCheck =
  | {
      ok: true;
      user: { id: string; email: string; name: string; role: "COACH" | "CLIENT" };
    }
  | { ok: false; reason: "invalid" | "rate_limited" | "demo_locked" };

export async function verifyCredentials(params: {
  email: string | undefined | null;
  password: string | undefined | null;
  /** Client address for the login rate limit; "unknown" when absent. */
  ip: string;
}): Promise<CredentialCheck> {
  if (!params.email || !params.password) {
    console.error("[AUTH] Missing credentials");
    return { ok: false, reason: "invalid" };
  }

  const email = params.email.trim().toLowerCase();

  // Demo credentials are public (login page, repo), so hiding the buttons
  // isn't enough — refuse the sign-in outright when demo mode is off, and
  // say so: to a tester with the seeded credentials this otherwise looks
  // exactly like a wrong password.
  if (isLockedDemoAccount(email)) {
    console.error("[AUTH] Demo account sign-in blocked (demo mode off)");
    return { ok: false, reason: "demo_locked" };
  }

  // Rate limit by IP + email to prevent brute-force. Logs carry user ids,
  // never emails — attempts (including attacker probes) are PII.
  const { allowed } = await loginLimiter(`${params.ip}:${email}`);
  if (!allowed) {
    console.error("[AUTH] Rate limited login attempt");
    return { ok: false, reason: "rate_limited" };
  }

  try {
    const user = await prisma.user.findFirst({
      where: { email, deletedAt: null },
    });

    if (!user) {
      console.error("[AUTH] Login attempt for unknown email");
      return { ok: false, reason: "invalid" };
    }

    const passwordMatch = await bcrypt.compare(params.password, user.passwordHash);
    if (!passwordMatch) {
      console.error("[AUTH] Password mismatch for user:", user.id);
      return { ok: false, reason: "invalid" };
    }

    console.log("[AUTH] Login successful for user:", user.id);
    return {
      ok: true,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    };
  } catch (error) {
    console.error("[AUTH] Error verifying credentials:", error);
    return { ok: false, reason: "invalid" };
  }
}

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { parseBody } from "@/lib/validations/parseBody";
import { passwordResetRequestSchema } from "@/lib/validations/schemas";
import { passwordResetRequestLimiter, getClientIp } from "@/lib/rate-limit";
import { createResetToken } from "@/lib/reset-token";
import { sendPasswordReset } from "@/lib/services/email";
import { appBaseUrl } from "@/lib/waitlist";
import { isDemoAccount } from "@/lib/demo";

/**
 * Request a password-reset email.
 *
 * Anti-enumeration: every well-formed request gets the same `{ ok: true }`,
 * whether the account exists, is soft-deleted, is a demo account, or the
 * mailer isn't configured — an attacker learns nothing about which emails
 * have accounts. Only the rate limit (429) and validation (400) differ, and
 * neither depends on account existence.
 */
export async function POST(req: Request) {
  try {
    const result = await parseBody(req, passwordResetRequestSchema);
    if (!result.success) return result.response;

    const { email } = result.data;

    const ip = getClientIp(req);
    const { allowed } = await passwordResetRequestLimiter(`${ip}:${email}`);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many reset requests. Please try again later." },
        { status: 429 }
      );
    }

    // Demo accounts share public credentials by design — letting anyone
    // rotate their password would brick the demo for everyone else.
    if (!isDemoAccount(email)) {
      const user = await prisma.user.findFirst({
        where: { email, deletedAt: null },
        select: { id: true, passwordHash: true },
      });

      if (user) {
        const token = createResetToken(user.id, user.passwordHash);
        if (token) {
          const resetUrl = `${appBaseUrl()}/reset-password?token=${encodeURIComponent(token)}`;
          // Log user ids rather than emails — same PII rule as login.
          console.log("[AUTH] Password reset requested for user:", user.id);
          await sendPasswordReset(email, resetUrl);
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Password reset request error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

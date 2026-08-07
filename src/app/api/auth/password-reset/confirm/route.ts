import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { parseBody } from "@/lib/validations/parseBody";
import { passwordResetConfirmSchema } from "@/lib/validations/schemas";
import { passwordResetConfirmLimiter, getClientIp } from "@/lib/rate-limit";
import { verifyResetToken, passwordFingerprint } from "@/lib/reset-token";
import { isDemoAccount } from "@/lib/demo";

/**
 * Redeem a reset token and set the new password.
 *
 * The fingerprint comparison is what makes the emailed link single-use:
 * updating passwordHash changes the fingerprint, so the just-redeemed token
 * (and any earlier unredeemed ones) stops verifying. Sessions are JWTs, so
 * existing logins survive a reset — acceptable for now, since whoever holds
 * the inbox controls the account either way.
 */
export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const { allowed } = await passwordResetConfirmLimiter(ip);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429 }
      );
    }

    const result = await parseBody(req, passwordResetConfirmSchema);
    if (!result.success) return result.response;

    const { token, password } = result.data;

    const verified = verifyResetToken(token);
    if (!verified) {
      return NextResponse.json(
        { error: "Reset link is invalid or expired" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: { id: verified.userId, deletedAt: null },
      select: { id: true, email: true, passwordHash: true },
    });

    // A fingerprint mismatch means the password already changed since the
    // link was minted — the token is spent. Same error as a bad token: the
    // distinction helps no legitimate user and would aid probing.
    if (
      !user ||
      isDemoAccount(user.email) ||
      passwordFingerprint(user.passwordHash) !== verified.fingerprint
    ) {
      return NextResponse.json(
        { error: "Reset link is invalid or expired" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    console.log("[AUTH] Password reset completed for user:", user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Password reset confirm error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

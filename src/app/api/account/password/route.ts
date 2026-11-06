import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/session";
import prisma from "@/lib/prisma";
import { isDemoAccount, isLockedDemoAccount } from "@/lib/demo";
import { parseBody } from "@/lib/validations/parseBody";
import { changePasswordSchema } from "@/lib/validations/schemas";
import { changePasswordLimiter } from "@/lib/rate-limit";
import { nowEpochSeconds, revokeSessionsAt } from "@/lib/session-validity";
import { respondWithFreshLogin } from "@/lib/reissue-login";

export const dynamic = "force-dynamic";

/**
 * PUT /api/account/password — signed-in password change (current + new).
 *
 * Updating passwordHash also invalidates any outstanding emailed reset
 * links: their tokens carry a fingerprint of the old hash (see
 * lib/reset-token.ts). It also signs out every other device: the cutoff in
 * sessionsValidAfter (lib/session-validity.ts) revokes every existing
 * login, and this device gets a fresh one in the response (a new cookie on
 * web, `session` in the body for the native app).
 */
export async function PUT(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.id || isLockedDemoAccount(session.user.email)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { allowed } = await changePasswordLimiter(session.user.id);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429 }
      );
    }

    const result = await parseBody(req, changePasswordSchema);
    if (!result.success) return result.response;
    const { currentPassword, newPassword } = result.data;

    const user = await prisma.user.findFirst({
      where: { id: session.user.id, deletedAt: null },
      select: { id: true, email: true, name: true, role: true, passwordHash: true },
    });
    // Demo accounts are shared logins — letting one visitor change the
    // password locks everyone else out
    if (!user || isDemoAccount(user.email)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const matches = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!matches) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const now = Date.now();
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, sessionsValidAfter: revokeSessionsAt(now) },
      select: { id: true },
    });

    console.log("[AUTH] Password changed for user:", user.id);
    const res = await respondWithFreshLogin(
      req,
      { id: user.id, email: user.email, name: user.name, role: user.role },
      nowEpochSeconds(now),
      { ok: true }
    );
    if (!res) {
      // The password did change; only re-signing this device in failed
      console.error("[AUTH_ALERT] NEXTAUTH_SECRET unset, cannot re-issue login");
      return NextResponse.json({ ok: true });
    }
    return res;
  } catch (error) {
    console.error("Password change error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

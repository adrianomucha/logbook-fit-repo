import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { isDemoAccount, isLockedDemoAccount } from "@/lib/demo";
import { parseBody } from "@/lib/validations/parseBody";
import { changePasswordSchema } from "@/lib/validations/schemas";
import { changePasswordLimiter } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * PUT /api/account/password — signed-in password change (current + new).
 *
 * Updating passwordHash also invalidates any outstanding emailed reset
 * links: their tokens carry a fingerprint of the old hash (see
 * lib/reset-token.ts). Sessions are 30-day JWTs and survive the change,
 * same trade-off as the reset flow.
 */
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
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
      select: { id: true, email: true, passwordHash: true },
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
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
      select: { id: true },
    });

    console.log("[AUTH] Password changed for user:", user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Password change error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/session";
import prisma from "@/lib/prisma";
import { isAdminEmail } from "@/lib/admin";
import { isLockedDemoAccount } from "@/lib/demo";
import { generateSecureToken } from "@/lib/tokens";
import { revokeSessionsAt } from "@/lib/session-validity";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/users/[id]/password — owner-only password reset.
 *
 * There is no self-serve reset flow yet, so this is how the owner regains
 * access to legacy accounts. Generates a strong temporary password and
 * returns it ONCE in the response for the admin to hand over out-of-band;
 * only the bcrypt hash is stored.
 *
 * Admin session only. Unlike the waitlist endpoints this deliberately does
 * NOT accept the WAITLIST_ADMIN_TOKEN bearer token: that token lives in
 * export scripts, and here it would turn into "take over any account".
 * getSession() (not getServerSession) so a deleted admin's leftover JWT is
 * refused. Admin accounts can't be reset here either, so one compromised
 * admin session can't lock the other admins out or take their accounts.
 *
 * Also signs the account out on every device (sessionsValidAfter).
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!isAdminEmail(session?.user?.email)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, deletedAt: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }
    if (user.deletedAt) {
      return NextResponse.json(
        { error: "This account is deleted" },
        { status: 409 }
      );
    }
    if (isAdminEmail(user.email)) {
      return NextResponse.json(
        {
          error:
            "Admin accounts can't be reset from here. Use the forgot-password flow instead.",
        },
        { status: 403 }
      );
    }
    if (isLockedDemoAccount(user.email)) {
      return NextResponse.json(
        {
          error:
            "Demo accounts are locked in this deployment — a new password couldn't be used to sign in anyway",
        },
        { status: 409 }
      );
    }

    // 12 random bytes → 16-char base64url string: comfortably above the
    // 8-char signup minimum and clean to copy (no quoting hazards).
    const tempPassword = generateSecureToken(12);
    await prisma.user.update({
      where: { id: user.id },
      // Ends every existing login too (lib/session-validity.ts)
      data: {
        passwordHash: await bcrypt.hash(tempPassword, 10),
        sessionsValidAfter: revokeSessionsAt(),
      },
    });

    return NextResponse.json({ ok: true, tempPassword });
  } catch (error) {
    console.error("Admin password reset error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { bearerToken, isAdminEmail, isValidAdminToken } from "@/lib/admin";
import { isLockedDemoAccount } from "@/lib/demo";
import { generateSecureToken } from "@/lib/tokens";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/users/[id]/password — owner-only password reset.
 *
 * There is no self-serve reset flow yet, so this is how the owner regains
 * access to legacy accounts. Generates a strong temporary password and
 * returns it ONCE in the response for the admin to hand over out-of-band;
 * only the bcrypt hash is stored. Authorized like the other admin
 * endpoints: admin session or the WAITLIST_ADMIN_TOKEN bearer token.
 *
 * Note: existing JWT sessions stay valid — this changes the credential,
 * it doesn't evict sessions.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = bearerToken(req);
    if (!isValidAdminToken(token)) {
      const session = await getServerSession(authOptions);
      if (!isAdminEmail(session?.user?.email)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
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
      data: { passwordHash: await bcrypt.hash(tempPassword, 10) },
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

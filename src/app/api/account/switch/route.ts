import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { isLockedDemoAccount } from "@/lib/demo";
import { createSwitchToken } from "@/lib/switch-token";

export const dynamic = "force-dynamic";

/**
 * POST /api/account/switch — mint a switch token for the linked account.
 *
 * The link (users.linkedUserId) is owner-managed and symmetric, so holding a
 * live session for either half of the pair is the sole credential needed to
 * step into the other. The returned token is redeemed immediately by the
 * client via signIn("account-switch") and dies after 60 seconds.
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { linkedUserId: true },
    });
    if (!me?.linkedUserId) {
      return NextResponse.json({ error: "No linked account" }, { status: 404 });
    }

    const target = await prisma.user.findFirst({
      where: { id: me.linkedUserId, deletedAt: null },
      select: { id: true, email: true, role: true },
    });
    if (!target) {
      return NextResponse.json({ error: "No linked account" }, { status: 404 });
    }
    // A switch is a sign-in; the demo lock applies to it like any other.
    if (isLockedDemoAccount(target.email)) {
      return NextResponse.json(
        { error: "Linked account is locked" },
        { status: 409 }
      );
    }

    const token = createSwitchToken(target.id);
    if (!token) {
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }

    return NextResponse.json({ token, role: target.role });
  } catch (error) {
    console.error("Account switch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

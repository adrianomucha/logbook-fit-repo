import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { isLockedDemoAccount } from "@/lib/demo";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || isLockedDemoAccount(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      timezone: true,
      createdAt: true,
      linkedUserId: true,
      coachProfile: {
        select: {
          id: true,
          bio: true,
        },
      },
      clientProfile: {
        select: {
          id: true,
          activePlanId: true,
          planStartDate: true,
          coachRelationship: {
            select: {
              status: true,
              coach: {
                select: {
                  id: true,
                  user: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // An ended relationship means "no coach" everywhere in the client app —
  // don't leak the old coach into the payload
  const clientProfile = user.clientProfile
    ? {
        ...user.clientProfile,
        coachRelationship:
          user.clientProfile.coachRelationship?.status === "ACTIVE"
            ? user.clientProfile.coachRelationship
            : null,
      }
    : null;

  // The paired account for the nav's one-click switch — only surfaced when
  // it could actually be switched into (exists, live, not demo-locked).
  let linkedAccount: { role: "COACH" | "CLIENT"; name: string } | null = null;
  if (user.linkedUserId) {
    const linked = await prisma.user.findFirst({
      where: { id: user.linkedUserId, deletedAt: null },
      select: { role: true, name: true, email: true },
    });
    if (linked && !isLockedDemoAccount(linked.email)) {
      linkedAccount = { role: linked.role, name: linked.name };
    }
  }

  return NextResponse.json({
    ...user,
    clientProfile,
    linkedAccount,
    // Lets the nav show the Admin entry point. Informational only — every
    // /admin page and API independently re-checks the allowlist server-side.
    isAdmin: isAdminEmail(session.user.email),
  });
}

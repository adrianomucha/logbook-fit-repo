import { NextResponse } from "next/server";
import { withCoach } from "@/lib/middleware/withAuth";
import prisma from "@/lib/prisma";
import { Session } from "next-auth";

/**
 * POST /api/invites
 * Creates a client invite with a UUID token and 7-day expiry.
 * Client signup via invite link auto-creates CoachClientRelationship.
 */
export const POST = withCoach(
  async (
    req: Request,
    _ctx: { params: Record<string, string> },
    _session: Session,
    coachProfileId: string
  ) => {
    const body = await req.json();
    const { email } = body as { email?: string };

    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const invite = await prisma.clientInvite.create({
      data: {
        coachId: coachProfileId,
        email: email || null,
        expiresAt: sevenDaysFromNow,
      },
    });

    return NextResponse.json(
      {
        id: invite.id,
        token: invite.token,
        email: invite.email,
        expiresAt: invite.expiresAt,
        inviteLink: `/signup?invite=${invite.token}`,
      },
      { status: 201 }
    );
  }
);

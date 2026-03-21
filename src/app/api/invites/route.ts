import { NextResponse } from "next/server";
import { withCoach } from "@/lib/middleware/withAuth";
import prisma from "@/lib/prisma";
import { Session } from "next-auth";
import { generateSecureToken } from "@/lib/tokens";
import { parseBody } from "@/lib/validations/parseBody";
import { createInviteSchema } from "@/lib/validations/schemas";
import { inviteLimiter, getClientIp } from "@/lib/rate-limit";

/**
 * POST /api/invites
 * Creates a client invite with a secure random token and 7-day expiry.
 * Client signup via invite link auto-creates CoachClientRelationship.
 */
export const POST = withCoach(
  async (
    req: Request,
    _ctx: { params: Record<string, string> },
    _session: Session,
    coachProfileId: string
  ) => {
    // Rate limit invite creation by IP
    const ip = getClientIp(req);
    const { allowed } = inviteLimiter(ip);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many invite requests. Please try again later." },
        { status: 429 }
      );
    }

    const result = await parseBody(req, createInviteSchema);
    if (!result.success) return result.response;
    const { email } = result.data;

    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const invite = await prisma.clientInvite.create({
      data: {
        coachId: coachProfileId,
        token: generateSecureToken(),
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

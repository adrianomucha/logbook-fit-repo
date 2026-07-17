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
    const { allowed } = await inviteLimiter(ip);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many invite requests. Please try again later." },
        { status: 429 }
      );
    }

    const result = await parseBody(req, createInviteSchema);
    if (!result.success) return result.response;
    const { email, note } = result.data;

    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const invite = await prisma.clientInvite.create({
      data: {
        coachId: coachProfileId,
        token: generateSecureToken(),
        email: email || null,
        note: note || null,
        expiresAt: sevenDaysFromNow,
      },
    });

    return NextResponse.json(
      {
        id: invite.id,
        token: invite.token,
        email: invite.email,
        note: invite.note,
        expiresAt: invite.expiresAt,
        inviteLink: `/signup?invite=${invite.token}`,
      },
      { status: 201 }
    );
  }
);

/**
 * GET /api/invites
 * Lists the coach's recent invites, newest first. PENDING invites past
 * their expiry are reported as EXPIRED. inviteLink is only included for
 * still-shareable (pending, unexpired) invites.
 */
export const GET = withCoach(
  async (
    _req: Request,
    _ctx: { params: Record<string, string> },
    _session: Session,
    coachProfileId: string
  ) => {
    const invites = await prisma.clientInvite.findMany({
      where: { coachId: coachProfileId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const now = new Date();
    return NextResponse.json(
      invites.map((invite) => {
        const status =
          invite.status === "PENDING" && invite.expiresAt < now
            ? "EXPIRED"
            : invite.status;
        return {
          id: invite.id,
          email: invite.email,
          status,
          expiresAt: invite.expiresAt,
          createdAt: invite.createdAt,
          ...(status === "PENDING"
            ? { inviteLink: `/signup?invite=${invite.token}` }
            : {}),
        };
      })
    );
  }
);

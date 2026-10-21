import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { withCoach } from "@/lib/middleware/withAuth";
import prisma from "@/lib/prisma";
import { inviteEmailLimiter } from "@/lib/rate-limit";
import { sendClientInvite } from "@/lib/services/email";
import { appBaseUrl } from "@/lib/waitlist";

// A second send this soon is a double-click or an impatient retry, not a
// reminder; the first one is still on its way
const RESEND_COOLDOWN_MS = 2 * 60 * 1000;

/**
 * POST /api/invites/[token]/send
 * Emails one of the coach's own pending invites to the address on it. The
 * address is set when the invite is created (POST /api/invites), so this
 * takes no body. Answers `{ sent }`: false means the mailer didn't take it
 * and the coach should share the link themselves.
 */
export const POST = withCoach(
  async (
    _req: Request,
    ctx: { params: Record<string, string> },
    _session: Session,
    coachProfileId: string
  ) => {
    const invite = await prisma.clientInvite.findFirst({
      where: { token: ctx.params.token, coachId: coachProfileId },
      include: { coach: { include: { user: { select: { name: true } } } } },
    });
    if (!invite) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }
    if (invite.status !== "PENDING" || invite.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "This link was used or has expired. Create a new one." },
        { status: 409 }
      );
    }
    if (!invite.email) {
      return NextResponse.json(
        { error: "Add their email to this invite first." },
        { status: 400 }
      );
    }
    if (
      invite.emailSentAt &&
      Date.now() - invite.emailSentAt.getTime() < RESEND_COOLDOWN_MS
    ) {
      return NextResponse.json(
        { error: "Just sent. Give it a minute to arrive." },
        { status: 429 }
      );
    }

    const { allowed } = await inviteEmailLimiter(coachProfileId);
    if (!allowed) {
      return NextResponse.json(
        { error: "You've sent a lot of invite emails this hour. Copy the link instead, or try again later." },
        { status: 429 }
      );
    }

    // Claim the send window before calling the mail provider: the check above
    // reads a snapshot, so two requests in flight together would both pass
    // it. Only one of them can move emailSentAt past the cooldown here.
    const claimedAt = new Date();
    const { count: claimed } = await prisma.clientInvite.updateMany({
      where: {
        id: invite.id,
        OR: [
          { emailSentAt: null },
          { emailSentAt: { lt: new Date(claimedAt.getTime() - RESEND_COOLDOWN_MS) } },
        ],
      },
      data: { emailSentAt: claimedAt },
    });
    if (claimed === 0) {
      return NextResponse.json(
        { error: "Just sent. Give it a minute to arrive." },
        { status: 429 }
      );
    }

    const sent = await sendClientInvite(invite.email, {
      coachName: invite.coach.user.name?.trim() || "Your coach",
      note: invite.note,
      inviteUrl: `${appBaseUrl()}/signup?invite=${encodeURIComponent(invite.token)}`,
      expiresAt: invite.expiresAt,
    });

    // Nothing went out, so give the window back: the card mustn't say
    // "Emailed to", and an immediate retry must be allowed
    if (!sent) {
      await prisma.clientInvite.updateMany({
        where: { id: invite.id, emailSentAt: claimedAt },
        data: { emailSentAt: invite.emailSentAt },
      });
    }

    return NextResponse.json({
      sent,
      email: invite.email,
      emailSentAt: sent ? claimedAt : invite.emailSentAt,
    });
  }
);

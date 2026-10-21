import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withCoach } from '@/lib/middleware/withAuth';
import { getSession } from '@/lib/session';
import { isLockedDemoAccount } from '@/lib/demo';
import type { Session } from 'next-auth';

/**
 * Who's looking at a valid invite, so the page can offer the right next step:
 * signed out → the signup form; a client with no coach → Accept; a client
 * who already has one, or a coach account → say why it can't be accepted
 * here. Null when signed out.
 */
async function inviteViewer(inviteCoachId: string) {
  const session = await getSession();
  if (!session || isLockedDemoAccount(session.user.email)) return null;

  const viewer = { email: session.user.email, role: session.user.role };
  if (session.user.role !== 'CLIENT') {
    return { ...viewer, connection: 'none' as const, currentCoachName: null };
  }

  const relationship = await prisma.coachClientRelationship.findFirst({
    where: { client: { userId: session.user.id }, status: 'ACTIVE' },
    select: { coachId: true, coach: { select: { user: { select: { name: true } } } } },
  });
  if (!relationship) {
    return { ...viewer, connection: 'none' as const, currentCoachName: null };
  }
  return {
    ...viewer,
    connection:
      relationship.coachId === inviteCoachId ? ('this_coach' as const) : ('other_coach' as const),
    currentCoachName: relationship.coach.user.name,
  };
}

/**
 * GET /api/invites/[token]
 * Public endpoint: validates an invite token for the signup page.
 * No auth required (clients aren't logged in yet); a signed-in caller also
 * gets `viewer` (see inviteViewer).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!token) {
    return NextResponse.json(
      { valid: false, reason: 'not_found' },
      { status: 404 }
    );
  }

  const invite = await prisma.clientInvite.findUnique({
    where: { token },
    include: {
      coach: {
        include: {
          user: { select: { name: true, avatarUrl: true } },
        },
      },
    },
  });

  if (!invite) {
    return NextResponse.json(
      { valid: false, reason: 'not_found' },
      { status: 404 }
    );
  }

  if (invite.status === 'ACCEPTED') {
    return NextResponse.json(
      { valid: false, reason: 'used' },
      { status: 410 }
    );
  }

  if (invite.expiresAt < new Date()) {
    return NextResponse.json(
      { valid: false, reason: 'expired' },
      { status: 410 }
    );
  }

  return NextResponse.json({
    valid: true,
    email: invite.email,
    note: invite.note,
    coachName: invite.coach.user.name ?? 'Your coach',
    coachAvatar: invite.coach.user.avatarUrl,
    coachBio: invite.coach.bio,
    expiresAt: invite.expiresAt.toISOString(),
    viewer: await inviteViewer(invite.coachId),
  });
}

/**
 * DELETE /api/invites/[token]
 * Coach revokes an invite they sent (e.g. it went to the wrong person).
 * The link stops working immediately. Accepted invites are history and
 * can't be revoked.
 */
export const DELETE = withCoach(
  async (
    _req: Request,
    ctx: { params: Record<string, string> },
    _session: Session,
    coachProfileId: string
  ) => {
    const token = ctx.params.token;

    const invite = await prisma.clientInvite.findFirst({
      where: { token, coachId: coachProfileId },
      select: { id: true, status: true },
    });

    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }
    if (invite.status === 'ACCEPTED') {
      return NextResponse.json(
        { error: 'This invite was already used and can’t be revoked' },
        { status: 409 }
      );
    }

    await prisma.clientInvite.delete({ where: { id: invite.id } });
    return NextResponse.json({ revoked: true });
  }
);

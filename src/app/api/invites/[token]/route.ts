import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/invites/[token]
 * Public endpoint — validates an invite token for the signup page.
 * No auth required (clients aren't logged in yet).
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
          user: { select: { name: true } },
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
    coachName: invite.coach.user.name ?? 'Your coach',
    expiresAt: invite.expiresAt.toISOString(),
  });
}

import { NextResponse } from "next/server";
import { Session } from "next-auth";
import { withCoach } from "@/lib/middleware/withAuth";
import prisma from "@/lib/prisma";
import type { CoachSetupCall } from "@/types/api";

export const dynamic = "force-dynamic";

/**
 * GET /api/coach/setup-call: the signed-in coach's setup call, for the
 * getting-started screen's "Book your setup call" prompt.
 *
 * The call lives on the coach's waitlist entry (matched by email), written
 * by the Cal.com webhook whether they booked from the waitlist or from the
 * dashboard. `call` is null when they've never booked.
 */
export const GET = withCoach(
  async (_req: Request, _ctx: { params: Record<string, string> }, session: Session) => {
    const email = session.user.email?.toLowerCase();
    const entry = email
      ? await prisma.waitlistEntry.findUnique({
          where: { email },
          select: { callStatus: true, callStartsAt: true },
        })
      : null;

    const body: CoachSetupCall = {
      call:
        entry?.callStatus && entry.callStartsAt
          ? { status: entry.callStatus, startsAt: entry.callStartsAt.toISOString() }
          : null,
    };
    return NextResponse.json(body);
  }
);

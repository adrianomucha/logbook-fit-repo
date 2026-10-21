import { Session } from "next-auth";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { isLockedDemoAccount } from "@/lib/demo";
import prisma from "@/lib/prisma";
import { withCoach } from "@/lib/middleware/withAuth";
import { unsendCheckIn } from "@/lib/checkin-schedule";

/**
 * GET /api/check-ins/[id]
 * Returns a check-in. Accessible by both the coach who created it
 * and the client it's for.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<Record<string, string>> }
) {
  const session = await getSession();
  if (!session || isLockedDemoAccount(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: checkInId } = await ctx.params;

  const checkIn = await prisma.checkIn.findUnique({
    where: { id: checkInId },
    include: {
      coach: {
        include: {
          user: { select: { id: true, name: true } },
        },
      },
      client: {
        include: {
          user: { select: { id: true, name: true } },
          completions: {
            where: { status: "COMPLETED" },
            orderBy: { completedAt: "desc" },
            take: 5,
            select: {
              id: true,
              completedAt: true,
              completionPct: true,
              effortRating: true,
              day: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  if (!checkIn) {
    return NextResponse.json({ error: "Check-in not found" }, { status: 404 });
  }

  // Verify requester is either the coach or the client
  const userId = session.user.id;
  const isCoach = checkIn.coach.user.id === userId;
  const isClient = checkIn.client.user.id === userId;

  if (!isCoach && !isClient) {
    return NextResponse.json({ error: "Check-in not found" }, { status: 404 });
  }

  return NextResponse.json(checkIn);
}

/**
 * DELETE /api/check-ins/[id]
 * Coach unsends a check-in they sent, while it's still unanswered.
 * Once the client has responded (or it's completed), it's part of the
 * conversation and can't be unsent. Unsending the check-in the schedule was
 * owed skips it for this cycle rather than deleting it (see unsendCheckIn),
 * so it doesn't come straight back.
 */
export const DELETE = withCoach(
  async (
    _req: Request,
    ctx: { params: Record<string, string> },
    _session: Session,
    coachProfileId: string
  ) => {
    const outcome = await unsendCheckIn(coachProfileId, ctx.params.id);

    if (!outcome) {
      return NextResponse.json(
        { error: "Check-in not found or already answered" },
        { status: 404 }
      );
    }

    return NextResponse.json({ deleted: true });
  }
);

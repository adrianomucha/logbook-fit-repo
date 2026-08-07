import { NextResponse } from "next/server";
import { withCoach } from "@/lib/middleware/withAuth";
import prisma from "@/lib/prisma";
import { Session } from "next-auth";
import { parseBody } from "@/lib/validations/parseBody";
import { coachRespondSchema } from "@/lib/validations/schemas";
import { notifyCheckInFeedback } from "@/lib/push";

/**
 * PUT /api/check-ins/[id]/coach-respond
 * Coach responds to a client-responded check-in
 * (CLIENT_RESPONDED → COMPLETED), or edits their feedback on an
 * already-completed one — typos shouldn't be permanent.
 */
export const PUT = withCoach(
  async (
    req: Request,
    ctx: { params: Record<string, string> },
    _session: Session,
    coachProfileId: string
  ) => {
    const checkInId = ctx.params.id;

    const checkIn = await prisma.checkIn.findFirst({
      where: {
        id: checkInId,
        coachId: coachProfileId,
        status: { in: ["CLIENT_RESPONDED", "COMPLETED"] },
      },
    });

    if (!checkIn) {
      return NextResponse.json(
        { error: "Check-in not found or not ready for review" },
        { status: 404 }
      );
    }

    const result = await parseBody(req, coachRespondSchema);
    if (!result.success) return result.response;
    const { coachFeedback, planAdjustment } = result.data;

    // An edit keeps the original completion timestamp and never clobbers
    // planAdjustment unless it was explicitly sent
    const isEdit = checkIn.status === "COMPLETED";

    const updated = await prisma.checkIn.update({
      where: { id: checkInId },
      data: {
        status: "COMPLETED",
        coachFeedback,
        ...(planAdjustment !== undefined
          ? { planAdjustment }
          : isEdit
            ? {}
            : { planAdjustment: false }),
        coachRespondedAt: new Date(),
        ...(isEdit ? {} : { completedAt: new Date() }),
      },
      include: {
        client: { select: { userId: true } },
        coach: { select: { user: { select: { name: true } } } },
      },
    });

    // Only on the first reply: an edit of a typo shouldn't re-ping the client
    // as if fresh feedback had arrived.
    if (!isEdit) {
      await notifyCheckInFeedback({
        clientUserId: updated.client.userId,
        coachName: updated.coach.user.name,
      });
    }

    return NextResponse.json(updated);
  }
);

import { NextResponse } from "next/server";
import { withCoach } from "@/lib/middleware/withAuth";
import prisma from "@/lib/prisma";
import { Session } from "next-auth";
import { parseBody } from "@/lib/validations/parseBody";
import { coachRespondSchema } from "@/lib/validations/schemas";

/**
 * PUT /api/check-ins/[id]/coach-respond
 * Coach responds to a client-responded check-in.
 * Transitions status: CLIENT_RESPONDED → COMPLETED
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
        status: "CLIENT_RESPONDED",
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

    const updated = await prisma.checkIn.update({
      where: { id: checkInId },
      data: {
        status: "COMPLETED",
        coachFeedback,
        planAdjustment: planAdjustment ?? false,
        coachRespondedAt: new Date(),
        completedAt: new Date(),
      },
    });

    return NextResponse.json(updated);
  }
);

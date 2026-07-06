import { NextResponse } from "next/server";
import { withCoach } from "@/lib/middleware/withAuth";
import prisma from "@/lib/prisma";
import { Session } from "next-auth";
import { parseBody } from "@/lib/validations/parseBody";
import { checkInScheduleSchema } from "@/lib/validations/schemas";
import { ensureScheduledCheckIn } from "@/lib/checkin-schedule";

/**
 * PUT /api/coach/clients/[id]/check-in-schedule
 * Enables or disables the weekly auto check-in for one of the coach's clients.
 * Enabling immediately materializes a check-in if one is already due.
 */
export const PUT = withCoach(
  async (
    req: Request,
    ctx: { params: Record<string, string> },
    _session: Session,
    coachProfileId: string
  ) => {
    const clientProfileId = ctx.params.id;

    const result = await parseBody(req, checkInScheduleSchema);
    if (!result.success) return result.response;
    const { enabled } = result.data;

    const relationship = await prisma.coachClientRelationship.findFirst({
      where: {
        coachId: coachProfileId,
        clientId: clientProfileId,
        status: "ACTIVE",
      },
    });
    if (!relationship) {
      return NextResponse.json(
        { error: "No active relationship with this client" },
        { status: 404 }
      );
    }

    const updated = await prisma.coachClientRelationship.update({
      where: { id: relationship.id },
      data: { checkInScheduleEnabled: enabled },
      select: { checkInScheduleEnabled: true },
    });

    // If a check-in is already overdue, turning the schedule on sends one now
    if (enabled) {
      await ensureScheduledCheckIn({ ...relationship, checkInScheduleEnabled: true });
    }

    return NextResponse.json(updated);
  }
);

import { NextResponse } from "next/server";
import { withCoach } from "@/lib/middleware/withAuth";
import prisma from "@/lib/prisma";
import { Session } from "next-auth";
import { parseBody } from "@/lib/validations/parseBody";
import { checkInScheduleSchema } from "@/lib/validations/schemas";
import { ensureScheduledCheckIn } from "@/lib/checkin-schedule";

/**
 * PUT /api/coach/clients/[id]/check-in-schedule
 * Updates the auto check-in schedule for one of the coach's clients: on/off,
 * cadence in days, and an optional anchor weekday. Partial — only the fields
 * sent are changed. Enabling or shortening the cadence immediately
 * materializes a check-in if one is already due.
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
    const { enabled, intervalDays, dayOfWeek } = result.data;

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

    const nextIntervalDays = intervalDays ?? relationship.checkInIntervalDays;
    // An anchor day only makes sense for cadences of a week or longer —
    // dropping to a shorter interval clears it rather than leaving a stale
    // setting that would silently reactivate on the next cadence change
    const nextDayOfWeek =
      nextIntervalDays < 7
        ? null
        : dayOfWeek !== undefined
          ? dayOfWeek
          : relationship.checkInDayOfWeek;

    const updated = await prisma.coachClientRelationship.update({
      where: { id: relationship.id },
      data: {
        checkInScheduleEnabled: enabled ?? relationship.checkInScheduleEnabled,
        checkInIntervalDays: nextIntervalDays,
        checkInDayOfWeek: nextDayOfWeek,
      },
      select: {
        checkInScheduleEnabled: true,
        checkInIntervalDays: true,
        checkInDayOfWeek: true,
      },
    });

    // If a check-in is already overdue under the new settings, send one now
    if (updated.checkInScheduleEnabled) {
      await ensureScheduledCheckIn({ ...relationship, ...updated });
    }

    return NextResponse.json(updated);
  }
);

import { NextResponse } from "next/server";
import { withClient } from "@/lib/middleware/withAuth";
import prisma from "@/lib/prisma";
import { Session } from "next-auth";
import { getPlanStartsOn, getRawWeekNumber } from "@/lib/workout-week-helpers";

/**
 * GET /api/client/week-overview
 * Returns the current week's days with workout status for the client's active plan.
 * Week math comes from the shared helper (Monday-anchored, on the client's
 * own calendar) so this can never disagree with what the UI shows. Past the
 * last week the response clamps to the final week and sets planEnded instead
 * of 404ing; before a plan set to start next Monday it returns week 1 as a
 * preview with startsOn set. Days with no exercises aren't workouts and are
 * left out.
 */
export const GET = withClient(
  async (
    _req: Request,
    _ctx: { params: Record<string, string> },
    _session: Session,
    clientProfileId: string
  ) => {
    const client = await prisma.clientProfile.findUnique({
      where: { id: clientProfileId },
      select: {
        activePlanId: true,
        planStartDate: true,
        user: { select: { timezone: true } },
      },
    });

    if (!client?.activePlanId || !client.planStartDate) {
      return NextResponse.json(
        { error: "No active plan assigned" },
        { status: 404 }
      );
    }

    const plan = await prisma.plan.findFirst({
      where: { id: client.activePlanId, deletedAt: null },
      select: { durationWeeks: true },
    });
    if (!plan) {
      return NextResponse.json(
        { error: "No active plan assigned" },
        { status: 404 }
      );
    }

    // Current week, clamped to the plan's last week once it has ended
    const timeZone = client.user.timezone;
    const rawWeekNumber = getRawWeekNumber(client.planStartDate, timeZone);
    const planEnded = rawWeekNumber > plan.durationWeeks;
    const currentWeekNumber = Math.max(
      1,
      Math.min(rawWeekNumber, plan.durationWeeks)
    );

    // Get the week from the plan
    const week = await prisma.week.findFirst({
      where: {
        planId: client.activePlanId,
        weekNumber: currentWeekNumber,
      },
      include: {
        days: {
          orderBy: { orderIndex: "asc" },
          include: {
            exercises: {
              orderBy: { orderIndex: "asc" },
              select: { id: true },
            },
            completions: {
              where: {
                clientId: clientProfileId,
                planId: client.activePlanId,
              },
              select: {
                id: true,
                status: true,
                completionPct: true,
                exercisesDone: true,
                startedAt: true,
                completedAt: true,
                durationSec: true,
                effortRating: true,
              },
            },
          },
        },
        plan: { select: { id: true, name: true, durationWeeks: true } },
      },
    });

    if (!week) {
      return NextResponse.json(
        { error: "Week not found in plan" },
        { status: 404 }
      );
    }

    const days = week.days.filter((day) => day.exercises.length > 0).map((day) => {
      const completion = day.completions[0];
      return {
        dayId: day.id,
        orderIndex: day.orderIndex,
        name: day.name,
        exerciseCount: day.exercises.length,
        status: completion?.status ?? "NOT_STARTED",
        completionPct: completion?.completionPct ?? null,
        exercisesDone: completion?.exercisesDone ?? null,
        completionId: completion?.id ?? null,
        startedAt: completion?.startedAt?.toISOString() ?? null,
        completedAt: completion?.completedAt?.toISOString() ?? null,
        durationSec: completion?.durationSec ?? null,
        effortRating: completion?.effortRating ?? null,
      };
    });

    return NextResponse.json({
      plan: week.plan,
      weekNumber: currentWeekNumber,
      weekId: week.id,
      planStartDate: client.planStartDate,
      planEnded,
      startsOn: getPlanStartsOn(client.planStartDate, timeZone),
      days,
    });
  }
);

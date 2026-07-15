import { NextResponse } from "next/server";
import { withClient } from "@/lib/middleware/withAuth";
import prisma from "@/lib/prisma";
import { Session } from "next-auth";
import { getRawWeekNumber } from "@/lib/workout-week-helpers";
import { workoutService } from "@/lib/services/workout";

/**
 * GET /api/client/week-overview
 * Returns the current week's days with workout status for the client's active plan.
 * Week math comes from the shared helper (Monday-anchored) so this can never
 * disagree with what the UI shows. Past the last week the response clamps to
 * the final week and sets planEnded instead of 404ing.
 */
export const GET = withClient(
  async (
    _req: Request,
    _ctx: { params: Record<string, string> },
    _session: Session,
    clientProfileId: string
  ) => {
    // Roll abandoned sessions into history before reading statuses, so the
    // dashboard never keeps pushing a days-old "Continue workout" card.
    // Best-effort: a janitor failure must not take down the dashboard.
    await workoutService
      .finalizeStaleSessions(clientProfileId)
      .catch((err) => console.error("finalizeStaleSessions failed", err));

    const client = await prisma.clientProfile.findUnique({
      where: { id: clientProfileId },
      select: {
        activePlanId: true,
        planStartDate: true,
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
    const rawWeekNumber = getRawWeekNumber(client.planStartDate);
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

    const days = week.days.map((day) => {
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
      days,
    });
  }
);

import { NextResponse } from "next/server";
import { withClient } from "@/lib/middleware/withAuth";
import prisma from "@/lib/prisma";
import { Session } from "next-auth";

/**
 * GET /api/client/week-overview
 * Returns the current week's days with workout status for the client's active plan.
 * Week number = ceil((daysSincePlanStart + 1) / 7)
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
      },
    });

    if (!client?.activePlanId || !client.planStartDate) {
      return NextResponse.json(
        { error: "No active plan assigned" },
        { status: 404 }
      );
    }

    // Calculate current week number
    const now = new Date();
    const daysSinceStart = Math.floor(
      (now.getTime() - client.planStartDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const currentWeekNumber = Math.ceil((daysSinceStart + 1) / 7);

    // Get the week from the plan
    const week = await prisma.week.findFirst({
      where: {
        planId: client.activePlanId,
        weekNumber: currentWeekNumber,
      },
      include: {
        days: {
          orderBy: { dayNumber: "asc" },
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
                completedAt: true,
              },
            },
          },
        },
        plan: { select: { id: true, name: true, durationWeeks: true } },
      },
    });

    if (!week) {
      return NextResponse.json(
        { error: "Week not found — plan may have ended" },
        { status: 404 }
      );
    }

    const days = week.days.map((day) => {
      const completion = day.completions[0];
      return {
        dayId: day.id,
        dayNumber: day.dayNumber,
        name: day.name,
        isRestDay: day.isRestDay,
        exerciseCount: day.exercises.length,
        status: completion?.status ?? "NOT_STARTED",
        completionPct: completion?.completionPct ?? null,
        completionId: completion?.id ?? null,
      };
    });

    return NextResponse.json({
      plan: week.plan,
      weekNumber: currentWeekNumber,
      weekId: week.id,
      planStartDate: client.planStartDate,
      days,
    });
  }
);

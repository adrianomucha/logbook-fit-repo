import { NextResponse } from "next/server";
import { withClient } from "@/lib/middleware/withAuth";
import prisma from "@/lib/prisma";
import { Session } from "next-auth";

/**
 * GET /api/client/progress
 * Returns recent workout history and stats for the client.
 * Last 7 days of completions + overall stats.
 */
export const GET = withClient(
  async (
    _req: Request,
    _ctx: { params: Record<string, string> },
    _session: Session,
    clientProfileId: string
  ) => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Recent completions (last 7 days)
    const recentCompletions = await prisma.workoutCompletion.findMany({
      where: {
        clientId: clientProfileId,
        status: "COMPLETED",
        completedAt: { gte: sevenDaysAgo },
      },
      orderBy: { completedAt: "desc" },
      select: {
        id: true,
        completedAt: true,
        completionPct: true,
        exercisesDone: true,
        exercisesTotal: true,
        durationSec: true,
        effortRating: true,
        day: {
          select: {
            name: true,
            dayNumber: true,
          },
        },
      },
    });

    // Overall stats
    const totalWorkouts = await prisma.workoutCompletion.count({
      where: { clientId: clientProfileId, status: "COMPLETED" },
    });

    const allCompletions = await prisma.workoutCompletion.findMany({
      where: { clientId: clientProfileId, status: "COMPLETED" },
      select: { completionPct: true },
    });

    const avgCompletionPct =
      allCompletions.length > 0
        ? allCompletions.reduce((sum, c) => sum + (c.completionPct ?? 0), 0) /
          allCompletions.length
        : 0;

    // Current streak (consecutive days with completed workouts)
    const allCompletedDates = await prisma.workoutCompletion.findMany({
      where: { clientId: clientProfileId, status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
      select: { completedAt: true },
    });

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const hasWorkout = allCompletedDates.some((c) => {
        if (!c.completedAt) return false;
        const d = new Date(c.completedAt);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === checkDate.getTime();
      });

      if (hasWorkout) {
        streak++;
      } else if (i > 0) {
        // Allow today to be missed (streak counts from last completed)
        break;
      }
    }

    return NextResponse.json({
      recentCompletions,
      stats: {
        totalWorkouts,
        avgCompletionPct: Math.round(avgCompletionPct * 100) / 100,
        currentStreak: streak,
        workoutsLast7Days: recentCompletions.length,
      },
    });
  }
);

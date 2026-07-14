import { NextResponse } from "next/server";
import { withCoach } from "@/lib/middleware/withAuth";
import prisma from "@/lib/prisma";
import { Session } from "next-auth";
import { ensureScheduledCheckIn } from "@/lib/checkin-schedule";
import { endCoachClientRelationship } from "@/lib/relationship-termination";
import { deleteSampleClient } from "@/lib/sample-client";
import { getClientUrgency } from "@/lib/urgency";

/**
 * GET /api/coach/clients/[id]
 * Returns detailed client profile for the authenticated coach.
 * Returns 404 if client not found or not owned by this coach.
 */
export const GET = withCoach(
  async (
    _req: Request,
    ctx: { params: Record<string, string> },
    _session: Session,
    coachProfileId: string
  ) => {
    const clientProfileId = ctx.params.id;

    // Verify coach-client relationship — an ended relationship closes the
    // workspace, so this behaves like the client no longer exists
    const relationship = await prisma.coachClientRelationship.findFirst({
      where: {
        coachId: coachProfileId,
        clientId: clientProfileId,
        status: "ACTIVE",
      },
    });

    if (!relationship) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Weekly schedule is enforced lazily — materialize a due check-in
    // before reading, so it's included in this response
    await ensureScheduledCheckIn(relationship);

    const client = await prisma.clientProfile.findUnique({
      where: { id: clientProfileId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            createdAt: true,
          },
        },
        activePlan: {
          select: {
            id: true,
            name: true,
            description: true,
            durationWeeks: true,
          },
        },
        completions: {
          // IN_PROGRESS rows are workouts the client started and never
          // finished — abandonment is a fade signal the coach must see
          where: { status: { in: ["COMPLETED", "IN_PROGRESS"] } },
          orderBy: { completedAt: { sort: "desc", nulls: "first" } },
          take: 10,
          select: {
            id: true,
            dayId: true,
            status: true,
            startedAt: true,
            completedAt: true,
            completionPct: true,
            exercisesDone: true,
            exercisesTotal: true,
            effortRating: true,
            durationSec: true,
            // Sets where the client overrode weight or reps — the coach
            // reviews these as deviations from the prescription
            sets: {
              where: {
                completed: true,
                OR: [
                  { actualWeight: { not: null } },
                  { actualReps: { not: null } },
                ],
              },
              orderBy: { setNumber: "asc" },
              select: {
                setNumber: true,
                actualWeight: true,
                actualReps: true,
                workoutExercise: {
                  select: {
                    trackingType: true,
                    weight: true,
                    reps: true,
                    repsMax: true,
                    exercise: { select: { name: true } },
                  },
                },
              },
            },
            day: {
              select: {
                name: true,
                orderIndex: true,
                week: { select: { id: true } },
              },
            },
            // Exercises the client flagged mid-workout — the coach reviews
            // these alongside check-ins
            flags: {
              select: {
                id: true,
                workoutExerciseId: true,
                note: true,
                createdAt: true,
              },
            },
          },
        },
        checkIns: {
          // Expired check-ins were never answered — noise, not history
          where: { status: { not: "EXPIRED" } },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            status: true,
            effortRating: true,
            createdAt: true,
            completedAt: true,
          },
        },
      },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Same urgency the dashboard ranks by — computed here too so the
    // profile can never disagree with the roster
    const lastWorkoutAt =
      client.completions.find((c) => c.status === "COMPLETED")?.completedAt ?? null;
    const openCheckIn = client.checkIns.find(
      (ci) => ci.status === "PENDING" || ci.status === "CLIENT_RESPONDED"
    );
    const { urgency, planStatus } = getClientUrgency({
      hasPlan: !!client.activePlan,
      planStartDate: client.planStartDate,
      planDurationWeeks: client.activePlan?.durationWeeks,
      lastWorkoutAt,
      openCheckInStatus: openCheckIn?.status ?? null,
    });

    return NextResponse.json({
      ...client,
      relationshipStatus: relationship.status,
      joinedAt: relationship.createdAt,
      planStartDate: client.planStartDate,
      checkInScheduleEnabled: relationship.checkInScheduleEnabled,
      lastWorkoutAt,
      urgency,
      planStatus,
    });
  }
);

/**
 * DELETE /api/coach/clients/[id]
 * Coach ends the coaching relationship with this client. The relationship is
 * kept as INACTIVE history; the client keeps their account and workout
 * history but loses the assigned plan and the messaging channel.
 * Idempotent — ending an already-ended relationship returns 200.
 */
export const DELETE = withCoach(
  async (
    _req: Request,
    ctx: { params: Record<string, string> },
    _session: Session,
    coachProfileId: string
  ) => {
    const clientProfileId = ctx.params.id;

    const relationship = await prisma.coachClientRelationship.findFirst({
      where: {
        coachId: coachProfileId,
        clientId: clientProfileId,
      },
      include: { client: { select: { isSample: true } } },
    });

    if (!relationship) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // A sample client isn't a real person — "ending" it removes the demo and
    // all its generated data instead of leaving an orphaned fake account
    if (relationship.client.isSample) {
      await deleteSampleClient(coachProfileId);
      return NextResponse.json({ ended: true, sampleRemoved: true });
    }

    if (relationship.status === "INACTIVE") {
      return NextResponse.json({ ended: true, endedAt: relationship.endedAt });
    }

    const ended = await endCoachClientRelationship(relationship, "COACH");
    return NextResponse.json({ ended: true, endedAt: ended.endedAt });
  }
);

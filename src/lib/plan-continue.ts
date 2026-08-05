import prisma from "@/lib/prisma";
import { buildPlanCloneData } from "@/lib/plan-clone";
import { getRawWeekNumber } from "@/lib/workout-week-helpers";

/**
 * "Run it again" — restart the plan a client just finished for another cycle.
 * Coach-only: what a client trains on next is the coach's call, so this is
 * reached solely through POST /api/coach/clients/[id]/plan/continue.
 *
 * The client gets a FRESH COPY rather than a reset date on the same rows.
 * WorkoutCompletion is unique per (client, plan, day), so reusing the plan
 * would have week 1 open already ticked off from the first cycle — and
 * wiping those rows would erase the history the Progress tab is built on.
 * A new copy starts empty and leaves every finished workout where it is.
 */

export type ContinuePlanFailure =
  | "NO_PLAN" // Nothing assigned to continue
  | "NOT_ENDED" // Still mid-plan — continuing would silently restart it
  | "PLAN_MISSING"; // Assigned plan row is gone (deleted template edge case)

export type ContinuePlanResult =
  | {
      ok: true;
      plan: { id: string; name: string; durationWeeks: number };
      planStartDate: Date;
    }
  | { ok: false; reason: ContinuePlanFailure };

/** Human-readable reason, used verbatim in API error bodies. */
export const CONTINUE_PLAN_MESSAGES: Record<ContinuePlanFailure, string> = {
  NO_PLAN: "No active plan to continue",
  NOT_ENDED: "This plan hasn't finished yet",
  PLAN_MISSING: "Plan not found",
};

export function continuePlanStatus(
  reason: ContinuePlanFailure
): 404 | 409 {
  return reason === "NOT_ENDED" ? 409 : 404;
}

/**
 * Whether a plan has run its course. Same rule the client's week-overview
 * uses for `planEnded`, so the button and the celebration screen can't
 * disagree about what "done" means.
 */
export function isPlanEnded(
  planStartDate: Date | string | null,
  durationWeeks: number
): boolean {
  if (!planStartDate) return false;
  return getRawWeekNumber(planStartDate) > durationWeeks;
}

/**
 * Clone the client's finished plan into a new cycle and put them on it.
 * Returns a discriminated result rather than throwing so the route can map
 * each failure onto its own status code.
 */
export async function continueClientPlan(
  clientProfileId: string
): Promise<ContinuePlanResult> {
  const client = await prisma.clientProfile.findUnique({
    where: { id: clientProfileId },
    select: { activePlanId: true, planStartDate: true },
  });

  if (!client?.activePlanId || !client.planStartDate) {
    return { ok: false, reason: "NO_PLAN" };
  }

  const current = await prisma.plan.findFirst({
    where: { id: client.activePlanId, deletedAt: null },
    include: {
      weeks: {
        orderBy: { weekNumber: "asc" },
        include: {
          days: {
            orderBy: { orderIndex: "asc" },
            include: { exercises: { orderBy: { orderIndex: "asc" } } },
          },
        },
      },
    },
  });

  if (!current) return { ok: false, reason: "PLAN_MISSING" };

  if (!isPlanEnded(client.planStartDate, current.durationWeeks)) {
    return { ok: false, reason: "NOT_ENDED" };
  }

  // Copy from the client's own instance, not the template: any mid-cycle
  // tailoring the coach did for this person carries into the next round.
  // The clone keeps pointing at the root template (buildPlanCloneData), so
  // "already on this plan" checks keep working.
  const nextCycle = await prisma.plan.create({
    data: buildPlanCloneData(current, current.coachId),
    select: { id: true, name: true, durationWeeks: true },
  });

  const planStartDate = new Date();
  await prisma.clientProfile.update({
    where: { id: clientProfileId },
    data: { activePlanId: nextCycle.id, planStartDate },
  });

  return { ok: true, plan: nextCycle, planStartDate };
}

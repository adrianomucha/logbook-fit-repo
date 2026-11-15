import prisma from "@/lib/prisma";

/**
 * Stamp a plan as edited now. Called by every route that changes what a
 * client trains (a day, an exercise, a week), so "has the plan changed since
 * the coach promised to adjust it?" has an answer. Plan.updatedAt does not
 * move when a nested row changes, which is why this exists.
 *
 * Best-effort: the edit itself already succeeded, and a missed stamp only
 * means the coach is reminded once more than needed.
 */
export async function markPlanEdited(planId: string): Promise<void> {
  try {
    await prisma.plan.updateMany({ where: { id: planId }, data: { editedAt: new Date() } });
  } catch (error) {
    console.error("Failed to stamp plan as edited:", error);
  }
}

/**
 * "I'll adjust the plan": the coach ticks it when completing a check-in, and
 * the client is told their coach is adjusting their plan. This works out
 * whether that has happened, so the coach is reminded until it has.
 */

/** A promise older than this stops nagging: the moment has passed. */
export const PLAN_ADJUSTMENT_REMINDER_DAYS = 21;

export interface PlanAdjustmentOwed {
  /** The check-in the coach made the promise on */
  checkInId: string;
  /** When they made it */
  promisedAt: string;
}

type CheckInFields = {
  id: string;
  status: string;
  planAdjustment: boolean | null;
  completedAt: Date | string | null;
};

/**
 * The coach's most recent "I'll adjust the plan", if the client's plan has
 * not changed since. `planChangedAt` is the last time the plan the client is
 * on was edited, or was assigned if never edited; null means no plan.
 */
export function planAdjustmentOwed(
  checkIns: CheckInFields[],
  planChangedAt: Date | string | null,
  now: Date = new Date()
): PlanAdjustmentOwed | null {
  let latest: { id: string; at: number } | null = null;
  for (const ci of checkIns) {
    if (ci.status !== 'COMPLETED' || !ci.planAdjustment || !ci.completedAt) continue;
    const at = new Date(ci.completedAt).getTime();
    if (!latest || at > latest.at) latest = { id: ci.id, at };
  }
  if (!latest) return null;

  const ageDays = (now.getTime() - latest.at) / (24 * 60 * 60 * 1000);
  if (ageDays > PLAN_ADJUSTMENT_REMINDER_DAYS) return null;

  if (planChangedAt && new Date(planChangedAt).getTime() > latest.at) return null;
  return { checkInId: latest.id, promisedAt: new Date(latest.at).toISOString() };
}

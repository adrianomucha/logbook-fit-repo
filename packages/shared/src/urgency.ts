import {
  getPlanProgressStatus,
  PlanProgressStatus,
} from './workout-week-helpers';

/**
 * The ONE definition of client urgency. The dashboard roster, the client
 * profile header, and any future surface must derive from this so the same
 * client can never show two different statuses on two screens.
 *
 * Ranking (0 = most urgent):
 * NEEDS_PLAN > PLAN_ENDED > AT_RISK > AWAITING_RESPONSE > CHECKIN_DUE > ON_TRACK
 * A client who already responded to a check-in outranks one who hasn't —
 * they're actively waiting on the coach.
 */

export type PlanStatus = 'NONE' | PlanProgressStatus;

export type ClientUrgency =
  | 'NEEDS_PLAN'
  | 'PLAN_ENDED'
  | 'AT_RISK'
  | 'AWAITING_RESPONSE'
  | 'CHECKIN_DUE'
  | 'ON_TRACK';

/**
 * Days of workout silence before a client counts as at risk. The clock starts
 * at the later of their last completed workout and their plan's start, so a
 * client gets a full window to begin a newly assigned plan.
 */
export const AT_RISK_AFTER_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface ClientUrgencyInput {
  hasPlan: boolean;
  planStartDate?: Date | string | null;
  planDurationWeeks?: number | null;
  /** Most recent COMPLETED workout, if any */
  lastWorkoutAt?: Date | string | null;
  /** Status of the newest open check-in: PENDING | CLIENT_RESPONDED */
  openCheckInStatus?: string | null;
}

export interface ClientUrgencyResult {
  urgency: ClientUrgency;
  urgencyOrder: number;
  planStatus: PlanStatus;
}

function toMs(value: Date | string | null | undefined): number | null {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
}

export function getClientUrgency(input: ClientUrgencyInput): ClientUrgencyResult {
  const planStatus: PlanStatus = !input.hasPlan
    ? 'NONE'
    : input.planStartDate && input.planDurationWeeks
      ? getPlanProgressStatus(input.planStartDate, input.planDurationWeeks)
      : 'ACTIVE';

  if (!input.hasPlan) {
    // Fresh signup waiting on their first plan — the coach's next move,
    // and the window where new clients churn if nothing happens
    return { urgency: 'NEEDS_PLAN', urgencyOrder: 0, planStatus };
  }

  if (planStatus === 'ENDED') {
    // Plan finished with nothing lined up — the highest-churn moment
    // after signup; the remedy is assigning the next block
    return { urgency: 'PLAN_ENDED', urgencyOrder: 1, planStatus };
  }

  // Silence is measured from the later of the last workout and the plan
  // start: a plan assigned today hasn't given the client a chance to train
  // yet, and a new block resets the clock for someone who drifted off the
  // last one. No plan start on record (legacy rows) falls back to workouts.
  const lastWorkoutMs = toMs(input.lastWorkoutAt);
  const planStartMs = toMs(input.planStartDate);
  const clockStartMs =
    lastWorkoutMs === null
      ? planStartMs
      : planStartMs === null
        ? lastWorkoutMs
        : Math.max(lastWorkoutMs, planStartMs);
  const atRiskCutoff = Date.now() - AT_RISK_AFTER_DAYS * DAY_MS;
  if (clockStartMs === null || clockStartMs < atRiskCutoff) {
    return { urgency: 'AT_RISK', urgencyOrder: 2, planStatus };
  }

  if (input.openCheckInStatus === 'CLIENT_RESPONDED') {
    return { urgency: 'AWAITING_RESPONSE', urgencyOrder: 3, planStatus };
  }

  if (input.openCheckInStatus === 'PENDING') {
    return { urgency: 'CHECKIN_DUE', urgencyOrder: 4, planStatus };
  }

  return { urgency: 'ON_TRACK', urgencyOrder: 5, planStatus };
}

/**
 * "started 2d ago" for a client still inside the at-risk grace window of a
 * plan they haven't trained on yet — explains why someone with no recent
 * workouts reads as on track. Null once they've trained since the plan
 * started, or once the window has run out (they're at risk then).
 */
export function newPlanHint(
  planStartDate: Date | string | null | undefined,
  lastWorkoutAt: Date | string | null | undefined,
  now: number = Date.now()
): string | null {
  const planStartMs = toMs(planStartDate);
  if (planStartMs === null) return null;
  const lastWorkoutMs = toMs(lastWorkoutAt);
  if (lastWorkoutMs !== null && lastWorkoutMs >= planStartMs) return null;

  const days = Math.max(0, Math.floor((now - planStartMs) / DAY_MS));
  if (days >= AT_RISK_AFTER_DAYS) return null;
  return days === 0 ? 'started today' : days === 1 ? 'started yesterday' : `started ${days}d ago`;
}

import {
  getPlanProgressStatus,
  PlanProgressStatus,
} from '@/lib/workout-week-helpers';

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

/** Days of workout silence before a client counts as at risk */
export const AT_RISK_AFTER_DAYS = 7;

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

  const atRiskCutoff = Date.now() - AT_RISK_AFTER_DAYS * 24 * 60 * 60 * 1000;
  const lastWorkoutMs = input.lastWorkoutAt
    ? new Date(input.lastWorkoutAt).getTime()
    : null;
  if (lastWorkoutMs === null || lastWorkoutMs < atRiskCutoff) {
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

import { startOfWeek } from 'date-fns';
import type { DashboardClient } from './types/api';

/**
 * The coach's roster: one list that is both the home page and the client
 * directory. Clients whose next move is the coach's go in "To do" with an
 * action; everyone else is a calm list below it. Pure and data-only so the
 * web and native apps split, label and word it the same way.
 */

export type Urgency = DashboardClient['urgency'];

export const URGENCY_LABEL: Record<Urgency, string> = {
  NEEDS_PLAN: 'Just Joined',
  PLAN_ENDED: 'Plan Ended',
  AT_RISK: 'At Risk',
  AWAITING_RESPONSE: 'Check-in Ready',
  CHECKIN_DUE: 'Check-in Due',
  ON_TRACK: 'On Track',
};

export const ROSTER_COPY = {
  toDo: 'To do',
  rest: 'Everyone else',
  allClear: 'Nothing waiting on you. Nice coaching.',
} as const;

/** Where a row's action takes the coach */
export type RosterActionTarget = 'check-in' | 'chat' | 'profile';

export interface RosterAction {
  label: string;
  target: RosterActionTarget;
}

/**
 * The one thing to do for this client right now, or null when nothing is
 * waiting on the coach. An unread message counts: a client who wrote in is
 * waiting on a reply whatever their plan status.
 */
export function rosterAction(client: DashboardClient, unreadCount = 0): RosterAction | null {
  // A submitted response always deserves a review, even when the client is
  // also at risk — their answer is the coach's opening to re-engage them
  if (client.pendingCheckIn?.status === 'CLIENT_RESPONDED') {
    return { label: 'Review Check-in', target: 'check-in' };
  }
  // A brand-new client who hasn't heard from the coach yet: the relationship
  // opens with a hello, not a plan assignment
  if (client.awaitingHello) return { label: 'Say Hello', target: 'chat' };
  switch (client.urgency) {
    case 'NEEDS_PLAN':
      return { label: 'Assign Plan', target: 'profile' };
    case 'PLAN_ENDED':
      return { label: 'Assign Next Plan', target: 'profile' };
    case 'AT_RISK':
      return { label: 'Send Reminder', target: 'chat' };
    case 'AWAITING_RESPONSE':
      return { label: 'Review Check-in', target: 'check-in' };
  }
  // CHECKIN_DUE means the check-in went out and the client hasn't replied:
  // the ball is in their court, so like ON_TRACK it isn't the coach's move
  // unless they've written in
  if (unreadCount > 0) return { label: 'Reply', target: 'chat' };
  return null;
}

export interface RosterGroups {
  toDo: DashboardClient[];
  rest: DashboardClient[];
}

/** Splits the roster, keeping the API's urgency order within each group. */
export function splitRoster(
  clients: DashboardClient[],
  unreadByUserId: ReadonlyMap<string, number> = new Map()
): RosterGroups {
  const toDo: DashboardClient[] = [];
  const rest: DashboardClient[] = [];
  for (const client of clients) {
    const action = rosterAction(client, unreadByUserId.get(client.user.id) ?? 0);
    (action ? toDo : rest).push(client);
  }
  return { toDo, rest };
}

/** Clients with a completed workout since Monday of the current week. */
export function trainedThisWeek(clients: DashboardClient[], now: Date = new Date()): number {
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }).getTime();
  return clients.filter(
    (c) => c.lastWorkoutAt && new Date(c.lastWorkoutAt).getTime() >= weekStart
  ).length;
}

/** The roster's one-line summary, e.g. "7 clients · 1 trained this week". */
export function rosterSummary(clients: DashboardClient[], now: Date = new Date()): string {
  const total = clients.length;
  const count = `${total} ${total === 1 ? 'client' : 'clients'}`;
  if (total === 0) return count;
  return `${count} · ${trainedThisWeek(clients, now)} trained this week`;
}

function daysSince(iso: string, now: number): number {
  return Math.floor((now - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

export type ClientSignal = { lead?: string; rest: string[] };

// The "signal": names *why* a client is flagged. An emphasized lead token
// carries the reason to act; the rest is quiet context. Built only from data
// that actually exists on DashboardClient — never invented. It never repeats
// the status chip beside it.
export function clientSignal(client: DashboardClient, now: number = Date.now()): ClientSignal {
  const rest: string[] = [];
  const plan = client.activePlan?.name;
  const finalWeek = client.planStatus === 'FINAL_WEEK';

  switch (client.urgency) {
    case 'NEEDS_PLAN': {
      // The first message matters more than the first plan — greet them
      // while joining is still news, then get them training
      if (client.awaitingHello) {
        return { lead: 'Say hello while it’s warm', rest: ['waiting on their first plan'] };
      }
      return { lead: 'Waiting on their first plan', rest };
    }
    case 'PLAN_ENDED': {
      // The chip already says the plan ended — name which one
      return plan ? { lead: `${plan} finished`, rest } : { lead: 'Ready for their next block', rest };
    }
    case 'AT_RISK': {
      const lead = client.lastWorkoutAt
        ? `${daysSince(client.lastWorkoutAt, now)}d silent`
        : 'No workouts yet';
      if (client.pendingCheckIn?.status === 'CLIENT_RESPONDED') {
        rest.push('check-in ready to review');
      } else if (client.pendingCheckIn) {
        rest.push('no reply to check-in');
      }
      if (plan) rest.push(plan);
      return { lead, rest };
    }
    case 'AWAITING_RESPONSE': {
      if (plan) rest.push(plan);
      if (finalWeek) rest.push('final week');
      return { lead: 'Ready to review', rest };
    }
    case 'CHECKIN_DUE': {
      if (plan) rest.push(plan);
      if (finalWeek) rest.push('final week');
      return { lead: 'Waiting on their check-in', rest };
    }
    case 'ON_TRACK': {
      if (plan) rest.push(plan);
      if (finalWeek) rest.push('final week, line up the next block');
      if (client.lastWorkoutAt) {
        const d = daysSince(client.lastWorkoutAt, now);
        rest.push(d <= 0 ? 'trained today' : d === 1 ? 'trained yesterday' : `last workout ${d}d ago`);
      } else {
        // On track without a workout only happens in a new plan's first
        // week (after that it's At Risk) — say so, quietly, so the row
        // doesn't look like an established client
        rest.push('just started, no workouts yet');
      }
      return { rest };
    }
  }
}

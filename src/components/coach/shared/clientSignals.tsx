import type { DashboardClient } from '@/types/api';

/**
 * Shared visual language for client urgency across coach surfaces
 * (dashboard roster, all-clients list): chip styles, the "signal" line
 * explaining *why* a client is flagged, and avatar colors.
 */

export type UrgencyStyle = {
  label: string;
  chip: string;
  dot: string;
};

export function urgencyStyle(urgency: DashboardClient['urgency']): UrgencyStyle {
  switch (urgency) {
    case 'NEEDS_PLAN':
      return {
        label: 'Just Joined',
        chip: 'bg-brand/25 text-brand-foreground dark:bg-brand/15 dark:text-brand',
        dot: 'bg-brand',
      };
    case 'PLAN_ENDED':
      return {
        label: 'Plan Ended',
        chip: 'bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300',
        dot: 'bg-violet-500',
      };
    case 'AT_RISK':
      return {
        label: 'At Risk',
        chip: 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300',
        dot: 'bg-red-500',
      };
    case 'AWAITING_RESPONSE':
      return {
        label: 'Check-in Ready',
        chip: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
        dot: 'bg-blue-500',
      };
    case 'CHECKIN_DUE':
      return {
        label: 'Check-in Due',
        chip: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
        dot: 'bg-amber-500',
      };
    case 'ON_TRACK':
      return {
        label: 'On Track',
        chip: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
        dot: 'bg-emerald-500',
      };
  }
}

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

export type ClientSignal = { lead?: string; rest: string[] };

// The "signal": names *why* a client is flagged. An emphasized lead token
// carries the reason to act; the rest is quiet context. Built only from data
// that actually exists on DashboardClient — never invented.
export function getSignal(client: DashboardClient): ClientSignal {
  const rest: string[] = [];
  const plan = client.activePlan?.name;
  const finalWeek = client.planStatus === 'FINAL_WEEK';

  switch (client.urgency) {
    case 'NEEDS_PLAN': {
      return { lead: 'Waiting on their first plan', rest };
    }
    case 'PLAN_ENDED': {
      if (plan) rest.push(`${plan} finished`);
      return { lead: 'Ready for their next block', rest };
    }
    case 'AT_RISK': {
      const lead = client.lastWorkoutAt
        ? `${daysSince(client.lastWorkoutAt)}d silent`
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
      return { lead: 'Check-in due', rest };
    }
    case 'ON_TRACK': {
      if (plan) rest.push(plan);
      if (finalWeek) rest.push('final week — line up the next block');
      if (client.lastWorkoutAt) {
        const d = daysSince(client.lastWorkoutAt);
        rest.push(d <= 0 ? 'trained today' : d === 1 ? 'trained yesterday' : `last workout ${d}d ago`);
      }
      return { rest };
    }
  }
}

// Deterministic color from name initial — shared with client surfaces so the
// same person renders the same color everywhere.
export { avatarColor } from '@/lib/avatar-colors';

export function SignalLine({ signal }: { signal: ClientSignal }) {
  const hasLead = !!signal.lead;
  return (
    <p className="text-xs sm:text-sm text-muted-foreground truncate mt-0.5">
      {hasLead && <span className="font-medium text-foreground/80">{signal.lead}</span>}
      {signal.rest.map((part, i) => (
        <span key={i}>
          {(hasLead || i > 0) && <span className="opacity-40"> · </span>}
          {part}
        </span>
      ))}
    </p>
  );
}

export function ChevronIcon() {
  return (
    <svg className="w-4 h-4 text-muted-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

import type { DashboardClient } from '@/types/api';

/**
 * Shared visual language for client urgency across coach surfaces
 * (dashboard roster, all-clients list): rail + chip styles, the
 * "signal" line explaining *why* a client is flagged, and avatar colors.
 */

export type UrgencyStyle = {
  label: string;
  rail: string;
  chip: string;
  dot: string;
};

export function urgencyStyle(urgency: DashboardClient['urgency']): UrgencyStyle {
  switch (urgency) {
    case 'AT_RISK':
      return {
        label: 'At Risk',
        rail: 'bg-red-500',
        chip: 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300',
        dot: 'bg-red-500',
      };
    case 'AWAITING_RESPONSE':
      return {
        label: 'Check-in Ready',
        rail: 'bg-blue-500',
        chip: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
        dot: 'bg-blue-500',
      };
    case 'CHECKIN_DUE':
      return {
        label: 'Check-in Due',
        rail: 'bg-amber-500',
        chip: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
        dot: 'bg-amber-500',
      };
    case 'ON_TRACK':
      return {
        label: 'On Track',
        rail: 'bg-transparent',
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

  switch (client.urgency) {
    case 'AT_RISK': {
      const lead = client.lastWorkoutAt
        ? `${daysSince(client.lastWorkoutAt)}d silent`
        : 'No workouts yet';
      if (client.pendingCheckIn) rest.push('no reply to check-in');
      if (plan) rest.push(plan);
      return { lead, rest };
    }
    case 'AWAITING_RESPONSE': {
      if (plan) rest.push(plan);
      return { lead: 'Ready to review', rest };
    }
    case 'CHECKIN_DUE': {
      if (plan) rest.push(plan);
      return { lead: 'Check-in due', rest };
    }
    case 'ON_TRACK': {
      if (plan) rest.push(plan);
      if (client.lastWorkoutAt) {
        const d = daysSince(client.lastWorkoutAt);
        rest.push(d <= 0 ? 'trained today' : d === 1 ? 'trained yesterday' : `last workout ${d}d ago`);
      }
      return { rest };
    }
  }
}

// Deterministic color from name initial — avoids bland gray avatars
const AVATAR_COLORS = [
  'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
  'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
  'bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
  'bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300',
  'bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300',
  'bg-pink-100 text-pink-700 dark:bg-pink-950/60 dark:text-pink-300',
] as const;

export function avatarColor(name: string) {
  const code = name.charCodeAt(0) || 0;
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

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

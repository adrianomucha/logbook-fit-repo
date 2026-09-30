import { MessageSquare } from 'lucide-react';
import { URGENCY_LABEL, type ClientSignal, type Urgency } from '@logbook/shared/roster';

/**
 * Shared visual language for client urgency across coach surfaces
 * (the roster and anything linking into it): chip styles, the "signal" line
 * explaining *why* a client is flagged, and avatar colors.
 */

export type UrgencyStyle = {
  label: string;
  chip: string;
  dot: string;
};

const URGENCY_TINT: Record<Urgency, { chip: string; dot: string }> = {
  NEEDS_PLAN: {
    chip: 'bg-brand/25 text-brand-foreground dark:bg-brand/15 dark:text-brand',
    dot: 'bg-brand',
  },
  PLAN_ENDED: {
    chip: 'bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300',
    dot: 'bg-violet-500',
  },
  AT_RISK: {
    chip: 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300',
    dot: 'bg-red-500',
  },
  AWAITING_RESPONSE: {
    chip: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
    dot: 'bg-blue-500',
  },
  CHECKIN_DUE: {
    chip: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
    dot: 'bg-amber-500',
  },
  ON_TRACK: {
    chip: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
    dot: 'bg-emerald-500',
  },
};

export function urgencyStyle(urgency: Urgency): UrgencyStyle {
  return { label: URGENCY_LABEL[urgency], ...URGENCY_TINT[urgency] };
}

// Wording lives in @logbook/shared so the native app says the same thing
export { clientSignal as getSignal, type ClientSignal } from '@logbook/shared/roster';

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

/**
 * Unanswered messages from this client — the most literal "act on me" a
 * roster row can carry, so it reads as a solid chip rather than a status tint.
 * Renders nothing at zero so callers can pass a count straight through.
 */
export function UnreadChip({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-foreground text-background text-[10px] sm:text-[11px] font-medium leading-none whitespace-nowrap flex-shrink-0"
      title={`${count} unread message${count === 1 ? '' : 's'}`}
    >
      <MessageSquare className="w-2.5 h-2.5" aria-hidden="true" />
      {count} new
    </span>
  );
}

export function ChevronIcon() {
  return (
    <svg className="w-4 h-4 text-muted-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

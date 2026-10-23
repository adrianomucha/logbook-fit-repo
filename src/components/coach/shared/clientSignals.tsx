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

// Colour says whose move it is, in the app's own tokens: lime is the
// coach's move (as lime is the client's next step), amber needs attention
// soon, red is a client slipping, grey is nothing to do.
const COACHS_MOVE = { chip: 'bg-brand/25 text-brand-foreground dark:bg-brand/15 dark:text-brand', dot: 'bg-brand' };
const NOTHING_TO_DO = { chip: 'bg-muted text-muted-foreground', dot: 'bg-muted-foreground/50' };
const URGENCY_TINT: Record<Urgency, { chip: string; dot: string }> = {
  NEEDS_PLAN: COACHS_MOVE,
  AWAITING_RESPONSE: COACHS_MOVE,
  PLAN_ENDED: { chip: 'bg-warning/10 text-warning-text', dot: 'bg-warning' },
  AT_RISK: { chip: 'bg-destructive/10 text-destructive', dot: 'bg-destructive' },
  CHECKIN_DUE: NOTHING_TO_DO,
  ON_TRACK: NOTHING_TO_DO,
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

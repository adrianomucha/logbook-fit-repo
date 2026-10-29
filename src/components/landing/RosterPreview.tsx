import { urgencyStyle } from '@/components/coach/shared/clientSignals';
import { avatarColor } from '@/lib/avatar-colors';
import { cn } from '@/lib/utils';
import type { Urgency } from '@logbook/shared/roster';

/**
 * A drawn roster for the marketing pages: the coach dashboard's ranking, one
 * row per status. Chip labels and colours come from the real roster
 * (urgencyStyle), and each signal line follows clientSignal's shape, so the
 * picture can't drift from what a coach sees after signing in.
 */

const ROWS: { name: string; urgency: Urgency; lead?: string; rest: string[] }[] = [
  { name: 'Maya Thompson', urgency: 'AT_RISK', lead: '9d silent', rest: ['no reply to check-in'] },
  { name: 'Nina Brooks', urgency: 'AWAITING_RESPONSE', rest: ['Strength block'] },
  { name: 'Owen Mitchell', urgency: 'PLAN_ENDED', lead: 'Strength block finished', rest: [] },
  { name: 'Jordan Lee', urgency: 'CHECKIN_DUE', lead: 'Waiting on their check-in', rest: [] },
  { name: 'Priya Shah', urgency: 'ON_TRACK', rest: ['Strength block', 'trained today'] },
];

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('');
}

export function RosterPreview({ className }: { className?: string }) {
  return (
    <div
      className={cn('overflow-hidden rounded-xl border border-border bg-card shadow-2xl', className)}
      aria-hidden="true"
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="text-sm font-semibold antialiased">Clients</span>
        <span className="font-mono text-[11px] tabular-nums text-muted-foreground antialiased">
          5 clients · 3 trained this week
        </span>
      </div>
      <ul className="divide-y divide-border">
        {ROWS.map((row) => {
          const style = urgencyStyle(row.urgency);
          return (
            <li key={row.name} className="flex items-center gap-3 px-4 py-3">
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
                  avatarColor(row.name)
                )}
              >
                {initials(row.name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium antialiased">{row.name}</span>
                <span className="block truncate text-xs text-muted-foreground antialiased">
                  {row.lead && <span className="font-medium text-foreground/80">{row.lead}</span>}
                  {row.rest.map((part, i) => (
                    <span key={part}>
                      {(row.lead || i > 0) && <span className="opacity-40"> · </span>}
                      {part}
                    </span>
                  ))}
                </span>
              </span>
              <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium', style.chip)}>
                {style.label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

import type { DashboardClient } from '@/types/api';
import {
  ROSTER_COPY,
  clientSignal,
  rosterAction,
  rosterSummary,
  splitRoster,
} from '@logbook/shared/roster';
import { UserAvatar } from '@/components/UserAvatar';
import { SignalLine, UnreadChip, urgencyStyle } from '@/components/coach/shared/clientSignals';
import { cn } from '@/lib/utils';

/**
 * The coach's roster, as the proof of the landing page's headline: a sample
 * roster run through the same split, signal and action functions the real
 * dashboard uses, drawn with the same chips and avatars. Nothing here is
 * worded by hand, so the page can't promise a ranking the product doesn't do.
 *
 * Static on purpose. Every date is measured from a fixed "now", so the page
 * still prerenders once and "9d silent" never drifts with the build date.
 */

const NOW = new Date('2026-11-12T15:00:00Z');
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (days: number) => new Date(NOW.getTime() - days * DAY).toISOString();

type Sample = {
  name: string;
  urgency: DashboardClient['urgency'];
  plan?: string;
  lastWorkoutDaysAgo?: number;
  checkIn?: 'PENDING' | 'CLIENT_RESPONDED';
  planStatus?: DashboardClient['planStatus'];
  awaitingHello?: boolean;
  unread?: number;
};

// In the API's urgency order: the client slipping away leads the list.
const SAMPLES: Sample[] = [
  { name: 'Maya Thompson', urgency: 'AT_RISK', plan: 'Strength Foundation', lastWorkoutDaysAgo: 9, checkIn: 'PENDING' },
  { name: 'Owen Mitchell', urgency: 'AWAITING_RESPONSE', plan: 'Hypertrophy Block', lastWorkoutDaysAgo: 1, checkIn: 'CLIENT_RESPONDED', unread: 2 },
  { name: 'Nina Brooks', urgency: 'PLAN_ENDED', plan: 'HIIT & Conditioning', lastWorkoutDaysAgo: 2, planStatus: 'ENDED' },
  { name: 'Sam Rivera', urgency: 'NEEDS_PLAN', planStatus: 'NONE', awaitingHello: true },
  { name: 'Priya Shah', urgency: 'CHECKIN_DUE', plan: 'Upper / Lower Split', lastWorkoutDaysAgo: 1, checkIn: 'PENDING' },
  { name: 'Daniel Okafor', urgency: 'ON_TRACK', plan: 'Powerlifting Prep', lastWorkoutDaysAgo: 0 },
  { name: 'Leah Kim', urgency: 'ON_TRACK', plan: 'Strength Foundation', lastWorkoutDaysAgo: 1, planStatus: 'FINAL_WEEK' },
];

const CLIENTS: DashboardClient[] = SAMPLES.map((sample, i) => ({
  clientProfileId: `sample-${i}`,
  user: { id: `sample-user-${i}`, name: sample.name, email: '', avatarUrl: null },
  activePlan: sample.plan ? { id: `sample-plan-${i}`, name: sample.plan, durationWeeks: 8 } : null,
  planStartDate: sample.plan ? daysAgo(28) : null,
  lastWorkoutAt: sample.lastWorkoutDaysAgo === undefined ? null : daysAgo(sample.lastWorkoutDaysAgo),
  pendingCheckIn: sample.checkIn
    ? { id: `sample-checkin-${i}`, status: sample.checkIn, createdAt: daysAgo(3) }
    : null,
  isSample: false,
  joinedAt: daysAgo(sample.plan ? 60 : 1),
  awaitingHello: sample.awaitingHello ?? false,
  planStatus: sample.planStatus ?? 'ACTIVE',
  urgency: sample.urgency,
  urgencyOrder: i,
}));

const UNREAD = new Map<string, number>(
  SAMPLES.map((sample, i) => [`sample-user-${i}`, sample.unread ?? 0])
);

function Row({ client }: { client: DashboardClient }) {
  const unread = UNREAD.get(client.user.id) ?? 0;
  const style = urgencyStyle(client.urgency);
  const action = rosterAction(client, unread);
  const name = client.user.name ?? '';

  return (
    <div className="flex items-center gap-3 px-3 py-3 sm:gap-4 sm:px-4 sm:py-3.5">
      <UserAvatar name={name} className="h-10 w-10 text-sm sm:h-11 sm:w-11 sm:text-base" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <p className="truncate text-sm font-semibold leading-tight sm:text-[15px]">{name}</p>
          <UnreadChip count={unread} />
          <span
            className={cn(
              'inline-flex flex-shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none sm:text-[11px]',
              style.chip
            )}
          >
            <span className={cn('h-1.5 w-1.5 rounded-full', style.dot)} />
            {style.label}
          </span>
        </div>
        <SignalLine signal={clientSignal(client, NOW.getTime())} />
      </div>
      {action && (
        <span className="hidden shrink-0 rounded-md border border-border px-3 py-1.5 text-xs font-medium sm:inline-flex">
          {action.label}
        </span>
      )}
    </div>
  );
}

function Group({ label, clients }: { label: string; clients: DashboardClient[] }) {
  return (
    <div>
      <p className="px-1 pb-2.5 font-mono text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground antialiased">
        {label} · {clients.length}
      </p>
      <div className="divide-y divide-border/50 overflow-hidden rounded-2xl border border-border/70 bg-card">
        {clients.map((client) => (
          <Row key={client.clientProfileId} client={client} />
        ))}
      </div>
    </div>
  );
}

export function RosterPreview({ className }: { className?: string }) {
  const groups = splitRoster(CLIENTS, UNREAD);

  return (
    <figure className={cn('w-full', className)}>
      {/* Decorative for assistive tech: the rows look like links and buttons
          but go nowhere, so the figcaption carries the meaning instead. */}
      <div
        aria-hidden="true"
        className="overflow-hidden rounded-2xl border border-border bg-background text-left text-foreground shadow-2xl shadow-black/40"
      >
        <div className="flex items-baseline justify-between gap-4 border-b border-border/70 px-4 py-4 sm:px-6">
          <p className="text-lg font-bold tracking-tight antialiased sm:text-xl">Clients</p>
          <p className="truncate text-xs text-muted-foreground antialiased sm:text-sm">
            {rosterSummary(CLIENTS, NOW)}
          </p>
        </div>
        <div className="space-y-6 p-3 sm:p-6">
          <Group label={ROSTER_COPY.toDo} clients={groups.toDo} />
          <Group label={ROSTER_COPY.rest} clients={groups.rest} />
        </div>
      </div>
      <figcaption className="mt-4 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground antialiased sm:text-[11px]">
        Your home screen: who needs you first, and why. Sample roster.
        <span className="sr-only">
          {' '}
          A sample roster of seven clients. Four are under To do, each with the
          reason and the next action: one at risk after nine days silent, one
          with a check-in ready to review, one whose plan ended, one who just
          joined. Three more are listed under Everyone else.
        </span>
      </figcaption>
    </figure>
  );
}

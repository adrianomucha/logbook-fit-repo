'use client';

import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { DashboardClient } from '@/types/api';
import {
  ROSTER_COPY,
  clientSignal,
  rosterAction,
  rosterSummary,
  splitRoster,
} from '@logbook/shared/roster';
import { UserAvatar } from '@/components/UserAvatar';
import {
  ChevronIcon,
  SignalLine,
  UnreadChip,
  urgencyStyle,
} from '@/components/coach/shared/clientSignals';
import { cn } from '@/lib/utils';

/**
 * The coach's roster, as the proof of the landing page's headline: a sample
 * roster run through the same split, signal and action functions the real
 * dashboard uses, drawn with the same chips and avatars. Nothing here is
 * worded by hand, so the page can't promise a ranking the product doesn't do.
 *
 * It is also a small playable demo. Each "To do" row does its action when
 * pressed: the sample client moves to their next state, the same functions
 * re-split the list, and the row glides to wherever it now belongs. Clear all
 * four and the roster shows the product's own all-clear line.
 *
 * Drawn in the light theme and meant for a dark canvas: keep it out of any
 * `dark` ancestor, or the chips and avatars flip to their dark variants. The
 * caption colour is literal for the same reason.
 *
 * Every date is measured from a fixed "now", so the server and the browser
 * render the same thing and "9d silent" never drifts with the build date.
 */

const NOW = new Date('2026-11-12T15:00:00Z');
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (days: number) => new Date(NOW.getTime() - days * DAY).toISOString();

type Urgency = DashboardClient['urgency'];

type SampleState = {
  urgency: Urgency;
  plan?: string;
  planStartedDaysAgo?: number;
  lastWorkoutDaysAgo?: number;
  checkIn?: 'PENDING' | 'CLIENT_RESPONDED' | null;
  planStatus?: DashboardClient['planStatus'];
  awaitingHello?: boolean;
  unread?: number;
};

type Sample = SampleState & {
  name: string;
  /** What each press of the row's action changes, in order */
  then?: Partial<SampleState>[];
};

const SAMPLES: Sample[] = [
  {
    name: 'Maya Thompson',
    urgency: 'AT_RISK',
    plan: 'Strength Foundation',
    lastWorkoutDaysAgo: 9,
    checkIn: 'PENDING',
    // Reaching out doesn't bring anyone back by itself: the ball is now hers
    then: [{ urgency: 'CHECKIN_DUE' }],
  },
  {
    name: 'Owen Mitchell',
    urgency: 'AWAITING_RESPONSE',
    plan: 'Hypertrophy Block',
    lastWorkoutDaysAgo: 1,
    checkIn: 'CLIENT_RESPONDED',
    unread: 2,
    then: [{ urgency: 'ON_TRACK', checkIn: null, unread: 0 }],
  },
  {
    name: 'Nina Brooks',
    urgency: 'PLAN_ENDED',
    plan: 'HIIT & Conditioning',
    lastWorkoutDaysAgo: 2,
    planStatus: 'ENDED',
    then: [{ urgency: 'ON_TRACK', plan: 'Strength Foundation', planStatus: 'ACTIVE', planStartedDaysAgo: 0 }],
  },
  {
    name: 'Sam Rivera',
    urgency: 'NEEDS_PLAN',
    planStatus: 'NONE',
    awaitingHello: true,
    // Two moves, as in the product: the hello first, then the first plan
    then: [
      { awaitingHello: false },
      { urgency: 'ON_TRACK', plan: 'Strength Foundation', planStatus: 'ACTIVE', planStartedDaysAgo: 0 },
    ],
  },
  { name: 'Priya Shah', urgency: 'CHECKIN_DUE', plan: 'Upper / Lower Split', lastWorkoutDaysAgo: 1, checkIn: 'PENDING' },
  { name: 'Daniel Okafor', urgency: 'ON_TRACK', plan: 'Powerlifting Prep', lastWorkoutDaysAgo: 0 },
  { name: 'Leah Kim', urgency: 'ON_TRACK', plan: 'Strength Foundation', lastWorkoutDaysAgo: 1, planStatus: 'FINAL_WEEK' },
];

// The order the dashboard lists clients in: the one slipping away first.
const URGENCY_RANK: Record<Urgency, number> = {
  AT_RISK: 0,
  AWAITING_RESPONSE: 1,
  PLAN_ENDED: 2,
  NEEDS_PLAN: 3,
  CHECKIN_DUE: 4,
  ON_TRACK: 5,
};

const userId = (index: number) => `sample-user-${index}`;

function buildRoster(steps: number[]) {
  const unread = new Map<string, number>();
  const clients = SAMPLES.map((sample, i): DashboardClient => {
    const state: SampleState = Object.assign({}, sample, ...(sample.then ?? []).slice(0, steps[i]));
    unread.set(userId(i), state.unread ?? 0);
    return {
      clientProfileId: `sample-${i}`,
      user: { id: userId(i), name: sample.name, email: '', avatarUrl: null },
      activePlan: state.plan ? { id: `sample-plan-${i}`, name: state.plan, durationWeeks: 8 } : null,
      planStartDate: state.plan ? daysAgo(state.planStartedDaysAgo ?? 28) : null,
      lastWorkoutAt:
        state.lastWorkoutDaysAgo === undefined ? null : daysAgo(state.lastWorkoutDaysAgo),
      pendingCheckIn: state.checkIn
        ? { id: `sample-checkin-${i}`, status: state.checkIn, createdAt: daysAgo(3) }
        : null,
      isSample: false,
      joinedAt: daysAgo(sample.plan ? 60 : 1),
      awaitingHello: state.awaitingHello ?? false,
      planStatus: state.planStatus ?? 'ACTIVE',
      urgency: state.urgency,
      urgencyOrder: URGENCY_RANK[state.urgency],
    };
  });
  // Stable, so clients of equal urgency keep their original order
  clients.sort((a, b) => a.urgencyOrder - b.urgencyOrder);
  return { clients, unread };
}

const NO_STEPS = SAMPLES.map(() => 0);

/** Where each row sits, so a re-split can be animated from the old spot. */
function rowTops(root: HTMLElement | null) {
  const tops = new Map<string, number>();
  root?.querySelectorAll<HTMLElement>('[data-row]').forEach((row) => {
    tops.set(row.dataset.row ?? '', row.getBoundingClientRect().top);
  });
  return tops;
}

function Row({
  client,
  unread,
  onAct,
}: {
  client: DashboardClient;
  unread: number;
  onAct: () => void;
}) {
  const style = urgencyStyle(client.urgency);
  const action = rosterAction(client, unread);
  const name = client.user.name ?? '';

  const content = (
    <>
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
        <>
          <span className="hidden shrink-0 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium transition-[background-color,border-color,transform] duration-150 ease-out group-hover:border-foreground/30 group-hover:bg-muted group-active:scale-[0.97] sm:inline-flex">
            {action.label}
          </span>
          <span className="shrink-0 pl-1 sm:hidden">
            <ChevronIcon />
          </span>
        </>
      )}
    </>
  );

  // Rows carry their own background and corners (the card can't clip them,
  // or a row gliding between the two cards would be cut off mid-flight).
  const shape =
    'relative flex w-full items-center gap-3 border-t border-border/50 bg-card px-3 py-3 text-left first:rounded-t-2xl first:border-t-0 last:rounded-b-2xl sm:gap-4 sm:px-4 sm:py-3.5';

  if (!action) {
    return (
      <div data-row={client.clientProfileId} className={shape}>
        {content}
      </div>
    );
  }
  return (
    <button
      type="button"
      data-row={client.clientProfileId}
      onClick={onAct}
      aria-label={`${action.label}: ${name} (demo)`}
      className={cn(
        shape,
        'group cursor-pointer transition-colors duration-150 hover:bg-muted/50 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
      )}
    >
      {content}
    </button>
  );
}

function GroupLabel({ label, count }: { label: string; count: number }) {
  return (
    <p className="px-1 pb-2.5 font-mono text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground antialiased">
      {label} · {count}
    </p>
  );
}

const CARD = 'rounded-2xl border border-border/70 bg-card';

export function RosterPreview({ className }: { className?: string }) {
  const [steps, setSteps] = useState(NO_STEPS);
  const listRef = useRef<HTMLDivElement>(null);
  // Row positions from just before the last press, consumed once after render
  const before = useRef<Map<string, number> | null>(null);

  const { clients, unread } = useMemo(() => buildRoster(steps), [steps]);
  const groups = splitRoster(clients, unread);
  const touched = steps.some((step) => step > 0);

  const update = (next: number[]) => {
    before.current = rowTops(listRef.current);
    setSteps(next);
  };

  // FLIP: every row that ended up somewhere new starts from where it was and
  // glides home. Transform only, so it stays on the compositor.
  useLayoutEffect(() => {
    const previous = before.current;
    before.current = null;
    if (!previous || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    for (const [id, top] of rowTops(listRef.current)) {
      const from = previous.get(id);
      if (from === undefined || Math.abs(from - top) < 1) continue;
      const row = listRef.current?.querySelector<HTMLElement>(`[data-row="${id}"]`);
      if (!row) continue;
      // The row that travels furthest is the one that was pressed: lift it
      // over the rows it passes.
      const far = Math.abs(from - top) > row.offsetHeight * 1.5;
      row.style.zIndex = far ? '2' : '1';
      const flight = row.animate(
        [
          { transform: `translateY(${from - top}px)`, boxShadow: far ? '0 8px 24px rgb(0 0 0 / 0.12)' : 'none' },
          { transform: 'translateY(0)', boxShadow: 'none' },
        ],
        { duration: far ? 480 : 360, easing: 'cubic-bezier(0.32, 0.72, 0, 1)' }
      );
      flight.onfinish = flight.oncancel = () => {
        row.style.zIndex = '';
      };
    }
  }, [steps]);

  return (
    <figure className={cn('w-full', className)}>
      <div className="overflow-hidden rounded-2xl border border-border bg-background text-left text-foreground shadow-2xl shadow-black/40">
        <div className="flex items-baseline justify-between gap-4 border-b border-border/70 px-4 py-4 sm:px-6">
          <p className="text-lg font-bold tracking-tight antialiased sm:text-xl">Clients</p>
          <p className="truncate text-xs text-muted-foreground antialiased sm:text-sm">
            {rosterSummary(clients, NOW)}
          </p>
        </div>
        <div ref={listRef} className="space-y-6 p-3 sm:p-6">
          {groups.toDo.length > 0 ? (
            <div>
              <GroupLabel label={ROSTER_COPY.toDo} count={groups.toDo.length} />
              <div className={CARD}>
                {groups.toDo.map((client) => {
                  const index = Number(client.clientProfileId.replace('sample-', ''));
                  return (
                    <Row
                      key={client.clientProfileId}
                      client={client}
                      unread={unread.get(client.user.id) ?? 0}
                      onAct={() => update(steps.map((step, i) => (i === index ? step + 1 : step)))}
                    />
                  );
                })}
              </div>
            </div>
          ) : (
            // As in the product: the whole "To do" group gives way to one line
            <p className={cn(CARD, 'animate-fade-in-up flex items-center gap-2 px-4 py-3.5 text-sm font-medium antialiased')}>
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" aria-hidden="true" />
              {ROSTER_COPY.allClear}
            </p>
          )}
          <div>
            <GroupLabel label={ROSTER_COPY.rest} count={groups.rest.length} />
            <div className={CARD}>
              {groups.rest.map((client) => (
                <Row
                  key={client.clientProfileId}
                  client={client}
                  unread={unread.get(client.user.id) ?? 0}
                  onAct={() => {}}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
      <figcaption className="mt-4 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-400 antialiased sm:text-[11px]">
        Your home screen: who needs you first, and why.{' '}
        {touched ? (
          <button
            type="button"
            onClick={() => update(NO_STEPS)}
            className="uppercase tracking-[0.16em] underline underline-offset-4 transition-colors hover:text-neutral-100"
          >
            Reset the sample
          </button>
        ) : (
          <>Sample roster: try clearing the to-do list.</>
        )}
      </figcaption>
    </figure>
  );
}

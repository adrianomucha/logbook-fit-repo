'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
 * It is also a small demo. Each "To do" row does its action when pressed: the
 * sample client moves to their next state, the same functions re-split the
 * list, and the row glides to wherever it now belongs. Clear all four and the
 * roster shows the product's own all-clear line.
 *
 * Left alone, it plays itself: it presses the top row, waits, presses the
 * next, shows the all-clear, resets and goes again. That is what tells a
 * visitor the rows do something. The first real press takes over and the
 * autoplay stops until the sample is reset. It only runs while the panel is
 * on screen, holds while the mouse is over it (so a row never moves out from
 * under the cursor), and never runs for reduced-motion visitors.
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

/**
 * Where everything that moves sits (rows and group labels), so a re-split can
 * be animated from the old spot. Rows also report what they say, so a row
 * whose status changed can ease its new wording in.
 */
function snapshot(root: HTMLElement | null) {
  const spots = new Map<string, { top: number; says: string }>();
  root?.querySelectorAll<HTMLElement>('[data-flip]').forEach((el) => {
    spots.set(el.dataset.flip ?? '', {
      top: el.getBoundingClientRect().top,
      says: el.dataset.says ?? '',
    });
  });
  return spots;
}

function Row({
  client,
  unread,
  onAct,
  pressing = false,
}: {
  client: DashboardClient;
  unread: number;
  onAct: () => void;
  /** The autoplay is "pressing" this row: show the pressed look */
  pressing?: boolean;
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
            data-detail
            className={cn(
              'inline-flex flex-shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none sm:text-[11px]',
              style.chip
            )}
          >
            <span className={cn('h-1.5 w-1.5 rounded-full', style.dot)} />
            {style.label}
          </span>
        </div>
        <div data-detail>
          <SignalLine signal={clientSignal(client, NOW.getTime())} />
        </div>
      </div>
      {action && (
        <>
          <span
            data-detail
            className={cn(
              'hidden shrink-0 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium transition-[background-color,border-color,transform] duration-200 ease-out group-hover:border-foreground/30 group-hover:bg-muted group-active:scale-[0.97] sm:inline-flex',
              // Lime, not the grey hover: the autoplay's press has to be
              // seen from across the page, and lime is the page's "act" colour
              pressing && 'scale-[0.95] border-brand bg-brand text-brand-foreground'
            )}
          >
            {action.label}
          </span>
          <span className="shrink-0 pl-1 sm:hidden">
            <ChevronIcon />
          </span>
        </>
      )}
    </>
  );

  // There is no card element: each row draws its own slice of the outline
  // (sides, a divider above, and the rounded ends on the first and last).
  // A real card would snap to its new height the instant a row left, while
  // the rows were still gliding. Drawn this way the outline travels with
  // the rows, so the two groups part and close up as one motion.
  const shape =
    'relative flex w-full items-center gap-3 border-x border-t border-border/70 border-t-border/50 bg-card px-3 py-3 text-left first:rounded-t-2xl first:border-t-border/70 last:rounded-b-2xl last:border-b sm:gap-4 sm:px-4 sm:py-3.5';
  const says = `${style.label}|${action?.label ?? ''}`;

  if (!action) {
    return (
      <div data-flip={client.clientProfileId} data-says={says} className={shape}>
        {content}
      </div>
    );
  }
  return (
    <button
      type="button"
      data-flip={client.clientProfileId}
      data-says={says}
      onClick={onAct}
      aria-label={`${action.label}: ${name} (demo)`}
      className={cn(
        shape,
        'group cursor-pointer transition-colors duration-200 hover:bg-muted/50 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        pressing && 'bg-brand/20'
      )}
    >
      {content}
    </button>
  );
}

function GroupLabel({ label, count }: { label: string; count: number }) {
  return (
    <p
      data-flip={`label:${label}`}
      className="px-1 pb-2.5 font-mono text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground antialiased"
    >
      {label} · {count}
    </p>
  );
}

const ALL_CLEAR = 'rounded-2xl border border-border/70 bg-card';

// Autoplay pacing. Each beat finishes before the next begins: press, glide,
// let the lime go, a moment of rest, then the next press. Overlapping them
// is what made the loop feel hurried.
const FIRST_PRESS_AFTER = 600;
const NEXT_PRESS_AFTER = 1500;
const PRESS_HOLD = 340;
const ALL_CLEAR_HOLD = 2600;

// One duration and one curve for everything that moves in a pass, so rows,
// labels and the pressed row travel as a single motion and arrive together.
// Ease-in-out, since these are things changing place on screen, not entering.
const GLIDE = { duration: 620, easing: 'cubic-bezier(0.65, 0, 0.35, 1)' } as const;

// The lime the pressed row carries, and lets go of after it lands. Opaque
// (the brand lime at 30% over white, flattened): the row passes over others
// on its way, and a see-through tint lets their text show through it.
const LANDING_TINT = '#eefdb7';

export function RosterPreview({
  className,
  panelClassName,
}: {
  className?: string;
  /** Extra classes for the panel itself, e.g. a height cap and fade */
  panelClassName?: string;
}) {
  const [steps, setSteps] = useState(NO_STEPS);
  // 'auto' until a visitor presses a row themselves
  const [mode, setMode] = useState<'auto' | 'manual'>('auto');
  const [onScreen, setOnScreen] = useState(false);
  // Mouse over the panel, or keyboard focus inside it: either way someone is
  // about to act on a row, so the autoplay must not move it away
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pressing, setPressing] = useState<string | null>(null);
  const figureRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  // Positions from just before the last change, consumed once after render,
  // and the row whose press caused it (none for a reset)
  const before = useRef<ReturnType<typeof snapshot> | null>(null);
  const pressed = useRef<string | null>(null);

  const { clients, unread } = useMemo(() => buildRoster(steps), [steps]);
  const groups = splitRoster(clients, unread);
  const touched = steps.some((step) => step > 0);
  const nextUp = groups.toDo[0]?.clientProfileId ?? null;

  const update = (next: number[], pressedRow: string | null = null) => {
    before.current = snapshot(listRef.current);
    pressed.current = pressedRow;
    setSteps(next);
  };
  const act = (clientProfileId: string) => {
    const index = Number(clientProfileId.replace('sample-', ''));
    update(steps.map((step, i) => (i === index ? step + 1 : step)), clientProfileId);
  };

  useEffect(() => {
    const figure = figureRef.current;
    if (!figure || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(
      ([entry]) => setOnScreen(entry.isIntersecting),
      { threshold: 0.4 }
    );
    observer.observe(figure);
    return () => observer.disconnect();
  }, []);

  // The all-clear state is a little taller than the others: its one line
  // (50px) stands in for a group label and a card border (28px). On a loop
  // that would nudge the page under the panel every few seconds, so the list
  // reserves the difference up front.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const reserve = () => {
      list.style.minHeight = '';
      list.style.minHeight = `${list.offsetHeight + 22}px`;
    };
    reserve();
    window.addEventListener('resize', reserve);
    return () => window.removeEventListener('resize', reserve);
  }, []);

  // The autoplay: one press (or the reset) per pass, rescheduled by each
  // change it makes. Any pause simply cancels the pending pass.
  useEffect(() => {
    if (mode !== 'auto' || !onScreen || hovered || focused) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    if (nextUp === null) {
      const reset = setTimeout(() => update(NO_STEPS), ALL_CLEAR_HOLD);
      return () => clearTimeout(reset);
    }
    let fire: ReturnType<typeof setTimeout> | undefined;
    const press = setTimeout(
      () => {
        setPressing(nextUp);
        fire = setTimeout(() => {
          setPressing(null);
          act(nextUp);
        }, PRESS_HOLD);
      },
      touched ? NEXT_PRESS_AFTER : FIRST_PRESS_AFTER
    );
    return () => {
      clearTimeout(press);
      clearTimeout(fire);
      setPressing(null);
    };
    // `act` and `update` close over `steps`, which is already a dependency
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, onScreen, hovered, focused, steps]);

  // FLIP: everything that ended up somewhere new starts from where it was
  // and glides home. Transform and opacity only, so it stays on the compositor.
  useLayoutEffect(() => {
    const previous = before.current;
    const pressedRow = pressed.current;
    before.current = null;
    pressed.current = null;
    if (!previous || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    for (const [id, now] of snapshot(listRef.current)) {
      const was = previous.get(id);
      if (!was) continue;
      const el = listRef.current?.querySelector<HTMLElement>(`[data-flip="${CSS.escape(id)}"]`);
      if (!el) continue;
      const isPressed = id === pressedRow;

      if (Math.abs(was.top - now.top) >= 1) {
        // The pressed row lifts over the rows it passes on its way
        el.style.zIndex = isPressed ? '2' : '1';
        const lift = isPressed ? '0 12px 32px rgb(0 0 0 / 0.16)' : '0 0 0 rgb(0 0 0 / 0)';
        const glide = el.animate(
          [
            { transform: `translateY(${was.top - now.top}px)`, boxShadow: '0 0 0 rgb(0 0 0 / 0)' },
            { boxShadow: lift, offset: 0.5 },
            { transform: 'translateY(0)', boxShadow: '0 0 0 rgb(0 0 0 / 0)' },
          ],
          GLIDE
        );
        glide.onfinish = glide.oncancel = () => {
          el.style.zIndex = '';
        };
      }

      // The pressed row carries the lime with it and lets it go once it has
      // landed, so the eye can follow which client moved and where to.
      if (isPressed) {
        el.animate(
          [{ backgroundColor: LANDING_TINT }, { backgroundColor: LANDING_TINT, offset: 0.55 }, {}],
          { duration: GLIDE.duration + 500, easing: 'ease-out' }
        );
      }

      // New wording (chip, reason, action) eases in instead of swapping
      if (was.says !== now.says) {
        el.querySelectorAll<HTMLElement>('[data-detail]').forEach((detail) => {
          detail.animate([{ opacity: 0 }, { opacity: 1 }], {
            duration: 420,
            delay: 120,
            easing: 'ease-out',
            fill: 'backwards',
          });
        });
      }
    }
  }, [steps]);

  return (
    <figure ref={figureRef} className={cn('w-full', className)}>
      <div
        className={cn(
          'overflow-hidden rounded-2xl border border-border bg-background text-left text-foreground shadow-2xl shadow-black/40',
          panelClassName
        )}
        onPointerEnter={(e) => e.pointerType === 'mouse' && setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        onFocus={() => setFocused(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false);
        }}
      >
        <div className="flex items-baseline justify-between gap-4 border-b border-border/70 px-4 py-4 sm:px-6">
          <p className="text-lg font-bold tracking-tight antialiased sm:text-xl">Clients</p>
          <p className="truncate text-xs text-muted-foreground antialiased sm:text-sm">
            {rosterSummary(clients, NOW)}
          </p>
        </div>
        <div ref={listRef} className="p-3 sm:p-6">
          <div className="space-y-6">
            {groups.toDo.length > 0 ? (
              <div>
                <GroupLabel label={ROSTER_COPY.toDo} count={groups.toDo.length} />
                <div>
                  {groups.toDo.map((client) => (
                    <Row
                      key={client.clientProfileId}
                      client={client}
                      unread={unread.get(client.user.id) ?? 0}
                      pressing={pressing === client.clientProfileId}
                      onAct={() => {
                        setMode('manual');
                        act(client.clientProfileId);
                      }}
                    />
                  ))}
                </div>
              </div>
            ) : (
              // As in the product: the whole "To do" group gives way to one line
              <p className={cn(ALL_CLEAR, 'animate-fade-in-up flex items-center gap-2 px-4 py-3.5 text-sm font-medium antialiased')}>
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" aria-hidden="true" />
                {ROSTER_COPY.allClear}
              </p>
            )}
            <div>
              <GroupLabel label={ROSTER_COPY.rest} count={groups.rest.length} />
              <div>
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
      </div>
      <figcaption className="mt-4 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-400 antialiased sm:text-[11px]">
        {mode === 'manual' ? (
          <button
            type="button"
            onClick={() => {
              update(NO_STEPS);
              setMode('auto');
              // A pressed row is removed while it still has focus, which
              // never fires blur: clear it here or the autoplay stays held
              setFocused(false);
            }}
            className="uppercase tracking-[0.16em] underline underline-offset-4 transition-colors hover:text-neutral-100"
          >
            Reset the sample
          </button>
        ) : (
          <>Sample roster. Press a row to try it.</>
        )}
      </figcaption>
    </figure>
  );
}

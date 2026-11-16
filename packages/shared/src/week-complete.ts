import type { WeekOverview } from './types/api';

/**
 * The week-complete moment: finishing the last open workout of the week
 * takes over the workout-finished screen. Volt floods the screen from the
 * centre, an ink medal stamped with the week number spins in and lands (and
 * can be spun by hand afterwards), the week's workouts tick off in a row,
 * and confetti falls once. The rule for when, the wording, the timings and
 * the confetti itself live here so the web app and the native app put on
 * the same show.
 */

export interface CompletedWeek {
  weekNumber: number;
  /** Workouts in the week, all of them now done */
  total: number;
  /** Seconds trained in the week's other workouts; add the one just finished for the week's total */
  otherSec: number;
}

/**
 * Whether finishing `dayId` closes out the week on screen. True when the
 * workout belongs to the week in the overview and every other workout in it
 * is already done. Days with no exercises are not workouts and don't count.
 *
 * The finished day's own status is ignored: the overview may not have
 * refetched yet at the moment the finish request returns.
 *
 * A workout from an earlier week (opened by stepping back) never matches:
 * the overview only knows the current week, and catching up on an old one
 * is not this week's finish line.
 */
export function weekCompletedBy(
  overview: Pick<WeekOverview, 'weekNumber' | 'days'> | null | undefined,
  dayId: string | null | undefined
): CompletedWeek | null {
  if (!overview || !dayId) return null;
  const workouts = overview.days.filter((d) => d.exerciseCount > 0);
  if (!workouts.some((d) => d.dayId === dayId)) return null;
  const othersDone = workouts.every((d) => d.dayId === dayId || d.status === 'COMPLETED');
  if (!othersDone) return null;
  const otherSec = workouts.reduce((sum, d) => (d.dayId === dayId ? sum : sum + (d.durationSec ?? 0)), 0);
  return { weekNumber: overview.weekNumber, total: workouts.length, otherSec };
}

export const WEEK_COMPLETE_COPY = {
  /** Replaces "Workout complete" above the workout's name */
  eyebrow: (weekNumber: number) => `Week ${weekNumber} complete`,
  /** The medal's face: a label over the week number, the tally under it */
  medalLabel: 'Week',
  medalNumber: (weekNumber: number) => String(weekNumber).padStart(2, '0'),
  medalTally: (total: number) => `${total} of ${total}`,
  /** The medal's back */
  medalBack: 'Logged',
  /** For screen readers, in place of the medal's parts */
  medalA11y: (weekNumber: number, total: number) =>
    `Week ${weekNumber} medal. ${total} of ${total} ${total === 1 ? 'workout' : 'workouts'} done. Drag to spin.`,
  /** The two stat blocks: the week's totals, not the one workout's */
  workoutsStat: 'Workouts',
  minutesStat: 'Min this week',
} as const;

/** Whole minutes trained this week, the workout just finished included */
export function weekMinutes(week: CompletedWeek, finishedDurationMin: number): number {
  return Math.round(week.otherSec / 60) + finishedDurationMin;
}

/**
 * The show's timeline, in ms from the screen appearing. One beat hands over
 * to the next: the flood, then the medal, then the row of ticks, with the
 * confetti released as the medal lands.
 */
export const WEEK_MOMENT = {
  /** Volt spreading from the medal's centre to the corners */
  floodMs: 550,
  /** The medal starts its spin while the flood is still spreading */
  medalDelay: 180,
  medalSpinMs: 1300,
  /** Full turns on the way in; whole, so it lands face up */
  medalTurns: 2,
  /** Where the medal scales up from */
  medalFrom: 0.5,
  /** Medal diameter, px */
  medalSize: 176,
  /** Degrees of spin per px dragged */
  dragDegPerPx: 0.9,
  /** A flick carries the medal on by its speed (px per ms) times this, in degrees */
  flickDegPerSpeed: 220,
  /** However hard the flick, it carries no further than this: two full turns */
  flickMaxDeg: 720,
  /** The copy and stats fade up once the screen is volt */
  contentDelay: 420,
  /** The week's ticks pop one after another, the last as the medal lands */
  ticksDelay: 900,
  tickStagger: 110,
  /** Released as the medal lands */
  confettiDelay: 1250,
} as const;

/** Where a released medal comes to rest: carried on by the flick, then onto the nearest face */
export function medalRestAngle(angle: number, speedPxPerMs: number): number {
  const carry = Math.max(-WEEK_MOMENT.flickMaxDeg, Math.min(WEEK_MOMENT.flickMaxDeg, speedPxPerMs * WEEK_MOMENT.flickDegPerSpeed));
  return Math.round((angle + carry) / 180) * 180;
}

/** One piece of confetti. Lengths are fractions of the screen so both apps scale them. */
export interface ConfettiPiece {
  /** Where it starts along the top edge, 0 (left) to 1 (right) */
  x: number;
  /** Sideways travel over the fall, as a fraction of the screen's width; negative drifts left */
  drift: number;
  /** Milliseconds before it starts to fall */
  delay: number;
  /** Milliseconds from the top edge to off the bottom */
  duration: number;
  /** Total rotation over the fall, in degrees */
  spin: number;
  /** Width in px; the height is `size * CONFETTI.aspect[shape]` */
  size: number;
  /** On the volt screen: ink leads, white is the accent */
  color: 'ink' | 'paper';
  shape: 'strip' | 'square';
}

export const CONFETTI = {
  count: 44,
  /** Height over width, per shape */
  aspect: { strip: 0.42, square: 1 },
  /** The whole burst is over this many ms after its release; unmount the layer then */
  totalMs: 3400,
} as const;

/** A small seeded generator (mulberry32) so the burst is the same on both apps and in tests */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The burst: pieces spread across the top edge, released over the first
 * 600ms, each falling once and leaving. Nothing loops; a celebration that
 * keeps going becomes wallpaper.
 */
export function confettiPieces(count: number = CONFETTI.count, seed = 7): ConfettiPiece[] {
  const rand = seeded(seed);
  return Array.from({ length: count }, (_, i) => {
    const duration = 1900 + Math.round(rand() * 900);
    return {
      // Even spread with a little jitter, so no clump and no bare patch
      x: (i + 0.15 + rand() * 0.7) / count,
      drift: (rand() - 0.5) * 0.3,
      delay: Math.round(rand() * 600),
      duration,
      spin: (rand() < 0.5 ? -1 : 1) * (360 + Math.round(rand() * 540)),
      size: 7 + Math.round(rand() * 5),
      // Two ink pieces for every white one
      color: i % 3 === 2 ? 'paper' : 'ink',
      shape: rand() < 0.6 ? 'strip' : 'square',
    };
  });
}

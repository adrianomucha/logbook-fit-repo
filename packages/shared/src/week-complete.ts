import type { WeekOverview } from './types/api';

/**
 * The week-complete moment: finishing the last open workout of the week
 * turns the workout-finished screen into a small party (a burst of confetti,
 * a second haptic in the app, and the week named in the headline). The rule
 * for when, the wording and the confetti itself live here so the web app and
 * the native app throw the same one.
 */

export interface CompletedWeek {
  weekNumber: number;
  /** Workouts in the week, all of them now done */
  total: number;
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
  return othersDone ? { weekNumber: overview.weekNumber, total: workouts.length } : null;
}

export const WEEK_COMPLETE_COPY = {
  /** Replaces "Workout complete" above the workout's name */
  eyebrow: (weekNumber: number) => `Week ${weekNumber} complete`,
  /** The line under the workout's name */
  tally: (total: number) => (total === 1 ? '1 of 1 workout this week' : `${total} of ${total} workouts this week`),
} as const;

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
  color: 'brand' | 'ink';
  shape: 'strip' | 'square';
}

export const CONFETTI = {
  count: 44,
  /** Height over width, per shape */
  aspect: { strip: 0.42, square: 1 },
  /** The whole burst is over by this many ms; unmount the layer after it */
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
      // Volt leads, ink is the accent: two brand pieces for every ink one
      color: i % 3 === 2 ? 'ink' : 'brand',
      shape: rand() < 0.6 ? 'strip' : 'square',
    };
  });
}

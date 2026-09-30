import { addDays, addWeeks, endOfWeek, format, getDay, isSameMonth, isWithinInterval, parseISO, startOfWeek } from 'date-fns';
import type { EffortRating, WorkoutCompletion, WorkoutDay, WorkoutPlan } from './types';
import { plausibleSessionSec } from './session-duration';

/**
 * The Progress tab's pure logic, shared by web and app: the one-sentence
 * verdict that connects this week's numbers to how the client is doing,
 * the week streak, and the workout log grouped by week.
 */

export type VerdictTone = 'success' | 'warning' | 'neutral';

export interface WeekVerdict {
  completed: number;
  target: number;
  text: string;
  tone: VerdictTone;
}

/** This week's completed sessions against the target, with coaching-flavoured encouragement. */
export function getWeekVerdict(completions: WorkoutCompletion[], targetPerWeek: number, now = new Date()): WeekVerdict {
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const thisWeekCompleted = completions.filter((c) => {
    if (!c.completedAt || c.status !== 'COMPLETED') return false;
    return isWithinInterval(parseISO(c.completedAt), { start: weekStart, end: weekEnd });
  }).length;

  const totalCompleted = completions.filter((c) => c.status === 'COMPLETED').length;
  const base = { completed: thisWeekCompleted, target: targetPerWeek };

  if (totalCompleted === 0) {
    return { ...base, text: 'Your first workout will kick things off.', tone: 'neutral' };
  }
  if (thisWeekCompleted >= targetPerWeek) {
    return { ...base, text: 'Target hit. Consistency is building.', tone: 'success' };
  }

  const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay();
  const expectedByNow = Math.ceil((dayOfWeek / 7) * targetPerWeek);
  if (thisWeekCompleted >= expectedByNow) {
    const remaining = targetPerWeek - thisWeekCompleted;
    return { ...base, text: remaining === 1 ? 'On pace, one more to go.' : `On pace, ${remaining} more to go.`, tone: 'success' };
  }
  if (thisWeekCompleted > 0) {
    const remaining = targetPerWeek - thisWeekCompleted;
    return { ...base, text: remaining === 1 ? 'Almost there, one more session.' : `${remaining} sessions to go.`, tone: 'warning' };
  }
  if (dayOfWeek <= 2) {
    return { ...base, text: "Week's just getting started.", tone: 'neutral' };
  }
  return { ...base, text: 'Still time to get sessions in.', tone: 'warning' };
}

/**
 * Consecutive weeks (Monday-start) with at least one workout, counting back
 * from now. The week in progress counts once there's a session in it and
 * never breaks the run while it's still open — Tuesday shouldn't read as a
 * lost streak. Deliberately not "weeks that hit the target": a client
 * training three times a week on a five-a-week plan is still consistent,
 * and a tile reading "0 wks" at them all block says the opposite.
 */
export function weeksTrainedStreak(completions: WorkoutCompletion[], now = new Date()): number {
  const trained = new Set<number>();
  for (const c of completions) {
    if (c.status !== 'COMPLETED' || !c.completedAt) continue;
    trained.add(startOfWeek(parseISO(c.completedAt), { weekStartsOn: 1 }).getTime());
  }

  let week = startOfWeek(now, { weekStartsOn: 1 });
  let streak = trained.has(week.getTime()) ? 1 : 0;
  // 104 weeks back is plenty — history is fetched a year at a time
  for (let i = 0; i < 104; i++) {
    week = addWeeks(week, -1);
    if (!trained.has(week.getTime())) break;
    streak++;
  }
  return streak;
}

/** "3 wks" — the streak tile's value */
export function formatWeekStreak(weeks: number): string {
  return `${weeks} ${weeks === 1 ? 'wk' : 'wks'}`;
}

/**
 * A user-friendly workout name with a fallback chain: the day's name from
 * the loaded plan, then the name the server sent (older plans aren't
 * loaded), then "Day N", then a date-based label.
 */
export function getWorkoutDisplayName(day: WorkoutDay | undefined, dayIndex: number, completion: WorkoutCompletion): string {
  if (day?.name) return day.name;
  if (completion.dayName) return completion.dayName;
  if (dayIndex >= 0) return `Day ${dayIndex + 1}`;
  if (completion.completedAt) {
    const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return `${names[getDay(parseISO(completion.completedAt))]} Workout`;
  }
  return 'Workout';
}

/** "45m" / "1h 5m" / "—". A session left open (see plausibleSessionSec) reads as unknown. */
export function formatHistoryDuration(seconds?: number): string {
  const sec = plausibleSessionSec(seconds);
  if (!sec) return '—';
  const mins = Math.floor(sec / 60);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export const EFFORT_LABELS: Record<EffortRating, string> = { EASY: 'Easy', MEDIUM: 'Medium', HARD: 'Hard' };

/** One session in the workout log */
export interface HistoryEntry {
  completion: WorkoutCompletion;
  name: string;
  /** Week of the loaded plan; null for work on a plan whose tree isn't loaded — claiming "Week 1" would be wrong */
  weekNumber: number | null;
  planName: string;
  /** Not every exercise finished — the one state worth marking on the row */
  partial: boolean;
  /** "2 of 5 exercises", only when partial */
  partialLabel?: string;
  /** Effort to call out on the row: only when it breaks from the client's usual, so it means something */
  effortCallout?: EffortRating;
  /** "Medium effort", only with a callout */
  effortLabel?: string;
  /** Personal bests set in this session */
  bests: number;
  /** "Tue 29 · 40m · 15 sets" — unknown parts left out. The row's quiet second line. */
  meta: string;
}

/** One Monday-start week of the log, newest first */
export interface HistoryWeek {
  key: string;
  /** "This week" / "Last week" / "Sep 14 – 20" */
  label: string;
  /** "3 sessions · 45 sets · 2 PBs" */
  summary: string;
  entries: HistoryEntry[];
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** "This week", "Last week", else the week's date range */
export function historyWeekLabel(weekStart: Date, now = new Date()): string {
  const thisWeek = startOfWeek(now, { weekStartsOn: 1 });
  if (weekStart.getTime() === thisWeek.getTime()) return 'This week';
  if (weekStart.getTime() === addWeeks(thisWeek, -1).getTime()) return 'Last week';
  const end = addDays(weekStart, 6);
  const range = isSameMonth(weekStart, end)
    ? `${format(weekStart, 'MMM d')} – ${format(end, 'd')}`
    : `${format(weekStart, 'MMM d')} – ${format(end, 'MMM d')}`;
  // A week touching another year says which
  return weekStart.getFullYear() === now.getFullYear() && end.getFullYear() === now.getFullYear()
    ? range
    : `${range}, ${end.getFullYear()}`;
}

/**
 * The workout log, grouped into weeks with a one-line summary each. Shared
 * so the web and the app group, name and summarize sessions identically.
 */
export function buildWorkoutHistory(
  completions: WorkoutCompletion[],
  plans: WorkoutPlan[],
  personalBests: { completionId: string }[] = [],
  now = new Date(),
): HistoryWeek[] {
  const done = completions
    .filter((c) => c.status === 'COMPLETED' && c.completedAt)
    .sort((a, b) => parseISO(b.completedAt!).getTime() - parseISO(a.completedAt!).getTime());

  const bestsBySession = new Map<string, number>();
  for (const b of personalBests) bestsBySession.set(b.completionId, (bestsBySession.get(b.completionId) ?? 0) + 1);

  // The client's usual effort. With too few ratings to have a habit, every
  // rating is news; past that, only the exceptions are.
  const effortCounts = new Map<EffortRating, number>();
  for (const c of done) if (c.effortRating) effortCounts.set(c.effortRating, (effortCounts.get(c.effortRating) ?? 0) + 1);
  const rated = [...effortCounts.values()].reduce((a, b) => a + b, 0);
  const usualEffort =
    rated >= 3 ? [...effortCounts.entries()].sort((a, b) => b[1] - a[1])[0][0] : undefined;

  const weeks: HistoryWeek[] = [];
  const byKey = new Map<string, { start: Date; entries: HistoryEntry[] }>();
  for (const completion of done) {
    const plan = plans.find((p) => p.id === completion.planId);
    const week = plan?.weeks.find((w) => w.id === completion.weekId);
    const day = week?.days.find((d) => d.id === completion.dayId);
    const dayIndex = week?.days.findIndex((d) => d.id === completion.dayId) ?? -1;
    const completedAt = parseISO(completion.completedAt!);
    const duration = plausibleSessionSec(completion.durationSec);
    const partial = completion.exercisesTotal > 0 && completion.exercisesDone < completion.exercisesTotal;
    const effortCallout =
      completion.effortRating && completion.effortRating !== usualEffort ? completion.effortRating : undefined;

    const entry: HistoryEntry = {
      completion,
      name: getWorkoutDisplayName(day, dayIndex, completion),
      weekNumber: week?.weekNumber ?? null,
      planName: plan?.name || 'Earlier plan',
      partial,
      partialLabel: partial ? `${completion.exercisesDone} of ${completion.exercisesTotal} exercises` : undefined,
      effortCallout,
      effortLabel: effortCallout ? `${EFFORT_LABELS[effortCallout]} effort` : undefined,
      bests: bestsBySession.get(completion.id) ?? 0,
      meta: [
        format(completedAt, 'EEE d'),
        duration ? formatHistoryDuration(duration) : null,
        completion.setsDone != null ? plural(completion.setsDone, 'set') : null,
      ]
        .filter(Boolean)
        .join(' · '),
    };

    const start = startOfWeek(completedAt, { weekStartsOn: 1 });
    const key = start.toISOString();
    const group = byKey.get(key);
    if (group) group.entries.push(entry);
    else byKey.set(key, { start, entries: [entry] });
  }

  for (const [key, { start, entries }] of byKey) {
    const sets = entries.every((e) => e.completion.setsDone != null)
      ? entries.reduce((sum, e) => sum + (e.completion.setsDone ?? 0), 0)
      : null;
    const bests = entries.reduce((sum, e) => sum + e.bests, 0);
    weeks.push({
      key,
      label: historyWeekLabel(start, now),
      summary: [
        plural(entries.length, 'session'),
        sets != null ? plural(sets, 'set') : null,
        bests > 0 ? plural(bests, 'PB') : null,
      ]
        .filter(Boolean)
        .join(' · '),
      entries,
    });
  }
  return weeks;
}

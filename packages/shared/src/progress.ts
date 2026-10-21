import { addDays, addWeeks, endOfWeek, format, getDay, isSameMonth, isWithinInterval, parseISO, startOfWeek } from 'date-fns';
import type { WorkoutCompletion, WorkoutDay, WorkoutPlan } from './types';

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

/** "6 weeks in a row" — a quiet line under this week's bar. Null below two weeks, where a streak says nothing. */
export function formatStreakLine(weeks: number): string | null {
  return weeks >= 2 ? `${weeks} weeks in a row` : null;
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

/** One session in the workout log: its name and day, and a mark for what's worth noticing */
export interface HistoryEntry {
  completion: WorkoutCompletion;
  name: string;
  /** "Tue 29" */
  date: string;
  /** Not every exercise finished — the one state worth marking on the row */
  partial: boolean;
  /** "2 of 5 exercises", only when partial */
  partialLabel?: string;
  /** Personal bests set in this session */
  bests: number;
}

/** One Monday-start week of the log, newest first */
export interface HistoryWeek {
  key: string;
  /** "This week" / "Last week" / "Sep 14 – 20" */
  label: string;
  entries: HistoryEntry[];
}

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
 * The workout log, grouped into weeks. Shared so the web and the app group
 * and name sessions identically.
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

  const weeks: HistoryWeek[] = [];
  const byKey = new Map<string, { start: Date; entries: HistoryEntry[] }>();
  for (const completion of done) {
    const plan = plans.find((p) => p.id === completion.planId);
    const week = plan?.weeks.find((w) => w.id === completion.weekId);
    const day = week?.days.find((d) => d.id === completion.dayId);
    const dayIndex = week?.days.findIndex((d) => d.id === completion.dayId) ?? -1;
    const completedAt = parseISO(completion.completedAt!);
    const partial = completion.exercisesTotal > 0 && completion.exercisesDone < completion.exercisesTotal;

    const entry: HistoryEntry = {
      completion,
      name: getWorkoutDisplayName(day, dayIndex, completion),
      date: format(completedAt, 'EEE d'),
      partial,
      partialLabel: partial ? `${completion.exercisesDone} of ${completion.exercisesTotal} exercises` : undefined,
      bests: bestsBySession.get(completion.id) ?? 0,
    };

    const start = startOfWeek(completedAt, { weekStartsOn: 1 });
    const key = start.toISOString();
    const group = byKey.get(key);
    if (group) group.entries.push(entry);
    else byKey.set(key, { start, entries: [entry] });
  }

  for (const [key, { start, entries }] of byKey) {
    weeks.push({ key, label: historyWeekLabel(start, now), entries });
  }
  return weeks;
}

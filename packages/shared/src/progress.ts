import { addDays, addWeeks, differenceInCalendarDays, format, getDay, isSameMonth, parseISO, startOfWeek } from 'date-fns';
import type { CheckIn, WorkoutCompletion, WorkoutDay, WorkoutPlan } from './types';
import { formatBestGain, formatBestValue, type PersonalBest } from './personal-bests';
import type { WeightUnit } from './weight-units';
import { isWorkoutDay, WORKOUT_MARK_LABEL, type WorkoutMark } from './workout-week-helpers';
import { parseSessionName } from './parse-session-name';

/**
 * The Progress tab's pure logic, shared by web and app: this week as a
 * sentence, and the client's training as a log, week by week, every
 * workout a row with its wins under it (bests, milestones, comebacks),
 * the coach's notes in the week they came.
 *
 * Built for adherence, not reporting: there's always a next step, every
 * win is named on the workout it came from, and a missed week leaves no
 * scar on the page.
 */

const completedSessions = (completions: WorkoutCompletion[]) =>
  completions
    .filter((c) => c.status === 'COMPLETED' && c.completedAt)
    .sort((a, b) => parseISO(a.completedAt!).getTime() - parseISO(b.completedAt!).getTime());

const weekStartOf = (iso: string) => startOfWeek(parseISO(iso), { weekStartsOn: 1 });

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

/**
 * A workout's name as the client reads it in a sentence: the coach's
 * "Day 5: Lower B + Core (Backup)" becomes "Lower B + Core". The same
 * cleanup the Today card and the week list apply.
 */
export function workoutTitle(name: string): string {
  return parseSessionName(name).title || name;
}

function sessionName(completion: WorkoutCompletion, plans: WorkoutPlan[]): string {
  const week = plans.find((p) => p.id === completion.planId)?.weeks.find((w) => w.id === completion.weekId);
  const dayIndex = week?.days.findIndex((d) => d.id === completion.dayId) ?? -1;
  return workoutTitle(getWorkoutDisplayName(week?.days[dayIndex], dayIndex, completion));
}

/** One circle in this week's stepper */
export interface WeekSlot {
  state: WorkoutMark;
  /** Under the circle: the weekday it was done ("Tue"), "Started", "Next", or nothing */
  label: string;
}

export interface ThisWeek {
  /** Workouts of this week done */
  completed: number;
  /** Workouts this week: the plan week's, else the plan's weekly target */
  target: number;
  /** One per workout (more if the client went over), at most a week's worth */
  slots: WeekSlot[];
  /** The bold half of the sentence: "1 down." */
  lead: string;
  /** The quiet half: "3 to go. Next up, Lower A." */
  rest: string;
}

/**
 * This week as circles and a sentence that always ends on what to do next.
 * It counts the plan's current week, the same workouts the Today tab lists,
 * so the two tabs never disagree. Without a plan week (no plan, or the coach
 * hasn't built it yet) it counts workouts since Monday against the target.
 */
export function describeThisWeek({
  plan,
  weekNumber,
  completions,
  target,
  startedDayId = null,
  now = new Date(),
}: {
  plan: WorkoutPlan | null;
  /** The plan week it is now (the week overview's); null once the plan has ended */
  weekNumber: number | null;
  completions: WorkoutCompletion[];
  /** Workouts a week, for when there's no plan week to count */
  target: number;
  /** A workout of this plan week that's been started but not finished */
  startedDayId?: string | null;
  now?: Date;
}): ThisWeek {
  const sessions = completedSessions(completions);
  const week = plan?.weeks.find((w) => w.weekNumber === weekNumber);
  // Days with no exercises aren't workouts (the Today tab leaves them out too)
  const weekWorkouts = week?.days.filter(isWorkoutDay) ?? [];

  let done: WorkoutCompletion[];
  let total = target;
  let nextUp: string | null = null;
  let started = false;
  if (week && weekWorkouts.length > 0) {
    const days = [...weekWorkouts].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
    const byDay = new Map(sessions.filter((c) => c.weekId === week.id).map((c) => [c.dayId, c]));
    // Circles fill in the order the workouts were done, whatever their order in the plan
    done = completedSessions(days.flatMap((d) => byDay.get(d.id) ?? []));
    // A workout already underway comes before the next one in plan order
    const left = days.filter((d) => !byDay.has(d.id));
    const current = left.find((d) => d.id === startedDayId) ?? left[0];
    started = !!current && current.id === startedDayId;
    nextUp = current ? workoutTitle(current.name || `Day ${current.orderIndex ?? days.indexOf(current) + 1}`) : null;
    total = days.length;
  } else {
    const thisMonday = startOfWeek(now, { weekStartsOn: 1 }).getTime();
    done = sessions.filter((c) => weekStartOf(c.completedAt!).getTime() === thisMonday);
  }

  const completed = done.length;
  const currentMark: WorkoutMark = started ? 'started' : 'next';
  const slots: WeekSlot[] = Array.from({ length: Math.min(7, Math.max(total, completed)) }, (_, i) =>
    i < completed
      ? { state: 'done', label: format(parseISO(done[i].completedAt!), 'EEE') }
      : i === completed
        ? { state: currentMark, label: WORKOUT_MARK_LABEL[currentMark] }
        : { state: 'upcoming', label: '' },
  );
  const base = { completed, target: total, slots };
  const upNext = nextUp ? (started ? `Finish ${nextUp}.` : completed > 0 ? `Next up, ${nextUp}.` : `First up, ${nextUp}.`) : null;

  if (completed >= total) {
    return { ...base, lead: completed > total ? `${completed} done.` : `All ${total} done.`, rest: 'Week complete. Rest up.' };
  }
  if (completed > 0) {
    const left = total - completed;
    return { ...base, lead: `${completed} down.`, rest: `${left} to go${upNext ? `. ${upNext}` : '.'}` };
  }
  if (sessions.length === 0) {
    return { ...base, lead: 'Fresh start.', rest: upNext ?? 'Your first workout kicks things off.' };
  }
  return { ...base, lead: 'New week.', rest: upNext ?? `${total} workouts to go.` };
}

/** A win marked on the workout it happened in */
export type WinKind = 'best' | 'milestone' | 'comeback';

export interface LogWin {
  kind: WinKind;
  /** "Bench Press" · "10 workouts logged" · "Back after 3 weeks off" */
  label: string;
  /** A best's numbers: "185 lb × 5, up 10 lb" */
  detail?: string;
}

/** One row of a week: a finished workout, or the coach's reply to a check-in */
export interface LogEntry {
  key: string;
  kind: 'workout' | 'coach';
  /** ISO time it happened */
  at: string;
  /** "Mon" */
  weekday: string;
  /** "26" */
  date: string;
  /** False for a second entry on the same day, which leaves the day off */
  firstOfDay: boolean;
  /** The workout's name, or "Sam on your check-in" */
  title: string;
  /** The coach's reply, word for word */
  note?: string;
  /** Bests, milestones and comebacks from this workout, biggest news first */
  wins: LogWin[];
  /** A workout the client left open and the idle sweep finished for them */
  autoFinished?: boolean;
}

/** A week's badge: the plan week finished, or a run of weeks reaching a milestone */
export interface LogBadge {
  kind: 'week' | 'streak';
  text: string;
}

/** One calendar week (Monday to Sunday) of the log */
export interface LogWeek {
  key: string;
  /** "This week" · "Last week" · "Oct 19 – 25" · "Dec 29 – Jan 4, 2025" */
  title: string;
  /** "3 workouts"; empty when the week only holds a note from the coach */
  summary: string;
  badges: LogBadge[];
  /** In the order they happened, Monday first */
  entries: LogEntry[];
}

/** "This week" · "Last week" · "Oct 19 – 25" · "Sep 28 – Oct 4" · "Dec 29 – Jan 4, 2025" */
export function formatWeekTitle(weekStart: Date, now = new Date()): string {
  const thisWeek = startOfWeek(now, { weekStartsOn: 1 });
  const weeksAgo = Math.round(differenceInCalendarDays(thisWeek, weekStart) / 7);
  if (weeksAgo <= 0) return 'This week';
  if (weeksAgo === 1) return 'Last week';
  const end = addDays(weekStart, 6);
  const range = isSameMonth(weekStart, end) ? `${format(weekStart, 'MMM d')} – ${format(end, 'd')}` : `${format(weekStart, 'MMM d')} – ${format(end, 'MMM d')}`;
  return end.getFullYear() === now.getFullYear() ? range : `${range}, ${end.getFullYear()}`;
}

/** Workout counts worth a line */
const isCountMilestone = (n: number) => n === 1 || n === 10 || n === 25 || (n >= 50 && n % 50 === 0);
/** Weeks-in-a-row runs worth a badge */
const isStreakMilestone = (n: number) => n === 3 || n === 5 || (n >= 10 && n % 5 === 0);
/** Days off that make the next session a comeback */
const COMEBACK_DAYS = 14;

const firstName = (name: string | null | undefined) => name?.trim().split(/\s+/)[0] || 'Your coach';

/**
 * The client's training as a log, a week to a section, newest week first.
 * Every finished workout gets a row with its wins under it (new bests,
 * workout-count milestones, a comeback after time off); the coach's replies
 * sit in the week they came; a finished plan week and a run of weeks in a
 * row are badges on the week. Weeks with nothing in them are left out, so a
 * missed week leaves no scar on the page.
 */
export function buildProgressLog({
  completions,
  plans,
  personalBests = [],
  checkIns = [],
  coachName,
  weightUnit,
  totalWorkouts,
  now = new Date(),
}: {
  completions: WorkoutCompletion[];
  plans: WorkoutPlan[];
  personalBests?: PersonalBest[];
  checkIns?: Pick<CheckIn, 'id' | 'coachResponse' | 'completedAt' | 'status'>[];
  coachName?: string | null;
  weightUnit: WeightUnit;
  /** All-time count of finished workouts. The completions only reach back a year, so this places them in the lifetime count. */
  totalWorkouts?: number;
  now?: Date;
}): LogWeek[] {
  const sessions = completedSessions(completions);
  // Workouts older than the history we were given
  const before = Math.max(0, (totalWorkouts ?? sessions.length) - sessions.length);

  const bestsBySession = new Map<string, PersonalBest[]>();
  for (const b of personalBests) bestsBySession.set(b.completionId, [...(bestsBySession.get(b.completionId) ?? []), b]);

  const weeks = new Map<number, { start: Date; entries: LogEntry[]; badges: LogBadge[]; workouts: number }>();
  const weekOf = (iso: string) => {
    const start = weekStartOf(iso);
    const key = start.getTime();
    if (!weeks.has(key)) weeks.set(key, { start, entries: [], badges: [], workouts: 0 });
    return weeks.get(key)!;
  };
  const entry = (e: Omit<LogEntry, 'weekday' | 'date' | 'firstOfDay'>): LogEntry => ({
    ...e,
    weekday: format(parseISO(e.at), 'EEE'),
    date: format(parseISO(e.at), 'd'),
    firstOfDay: true,
  });

  sessions.forEach((c, i) => {
    const wins: LogWin[] = [];
    // Bests first, then the workout count, then a comeback
    for (const b of bestsBySession.get(c.id) ?? []) {
      wins.push({ kind: 'best', label: b.exerciseName, detail: `${formatBestValue(b, weightUnit)}, ${formatBestGain(b, weightUnit)}` });
    }
    const count = before + i + 1;
    if (isCountMilestone(count)) wins.push({ kind: 'milestone', label: count === 1 ? 'First workout logged' : `${count} workouts logged` });
    const previous = sessions[i - 1];
    const gap = previous ? differenceInCalendarDays(parseISO(c.completedAt!), parseISO(previous.completedAt!)) : 0;
    if (gap >= COMEBACK_DAYS) {
      const off = Math.round(gap / 7);
      wins.push({ kind: 'comeback', label: `Back after ${off} ${off === 1 ? 'week' : 'weeks'} off` });
    }
    const week = weekOf(c.completedAt!);
    week.workouts++;
    week.entries.push(
      entry({ key: `workout-${c.id}`, kind: 'workout', at: c.completedAt!, title: sessionName(c, plans), wins, autoFinished: c.autoFinished || undefined })
    );
  });

  // Every workout of a plan week done: a badge on the week the last one fell in
  for (const plan of plans) {
    for (const week of plan.weeks) {
      const workouts = week.days.filter(isWorkoutDay);
      if (workouts.length === 0) continue;
      const inWeek = sessions.filter((c) => c.planId === plan.id && c.weekId === week.id);
      if (!workouts.every((d) => inWeek.some((c) => c.dayId === d.id))) continue;
      weekOf(inWeek[inWeek.length - 1].completedAt!).badges.push({ kind: 'week', text: `Week ${week.weekNumber} complete` });
    }
  }

  // Weeks in a row: a badge when a run reaches a milestone
  const trained = [...new Set(sessions.map((c) => weekStartOf(c.completedAt!).getTime()))];
  let run = 0;
  // Longest of the runs before this one, so a run beating it can say so
  let longestBefore = 0;
  let runStart: number | null = null;
  // With older history cut off, a run starting in the first week we have may
  // have started earlier: its length is unknown, so it gets no badge
  const edgeWeek = before > 0 ? trained[0] : undefined;
  trained.forEach((week, i) => {
    if (i === 0 || addWeeks(new Date(trained[i - 1]), 1).getTime() !== week) {
      longestBefore = Math.max(longestBefore, run);
      run = 0;
      runStart = week;
    }
    run++;
    if (isStreakMilestone(run) && runStart !== edgeWeek) {
      const longest = longestBefore >= 2 && run > longestBefore;
      weeks.get(week)!.badges.push({ kind: 'streak', text: longest ? `${run} weeks in a row, your longest yet` : `${run} weeks in a row` });
    }
  });

  // The coach's replies, in the week they came
  for (const ci of checkIns) {
    if (ci.status !== 'completed' || !ci.coachResponse?.trim() || !ci.completedAt) continue;
    weekOf(ci.completedAt).entries.push(
      entry({ key: `coach-${ci.id}`, kind: 'coach', at: ci.completedAt, title: `${firstName(coachName)} on your check-in`, note: ci.coachResponse.trim(), wins: [] }),
    );
  }

  return [...weeks.entries()]
    .sort(([a], [b]) => b - a)
    .map(([key, w]) => ({
      key: `week-${key}`,
      title: formatWeekTitle(w.start, now),
      summary: w.workouts === 0 ? '' : w.workouts === 1 ? '1 workout' : `${w.workouts} workouts`,
      // A finished plan week before a streak
      badges: [...w.badges].sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'week' ? -1 : 1)),
      entries: [...w.entries]
        .sort((a, b) => parseISO(a.at).getTime() - parseISO(b.at).getTime())
        .map((e, i, all) => ({ ...e, firstOfDay: i === 0 || all[i - 1].date !== e.date })),
    }));
}

/** Weeks shown before "Show earlier weeks" */
export const LOG_PAGE_WEEKS = 4;

/** The log before there's anything in it */
export const LOG_EMPTY_TEXT = 'Your workouts show up here week by week, with every new best and every note from your coach.';

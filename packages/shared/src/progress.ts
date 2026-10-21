import { addWeeks, differenceInCalendarDays, format, getDay, parseISO, startOfWeek } from 'date-fns';
import type { CheckIn, WorkoutCompletion, WorkoutDay, WorkoutPlan } from './types';
import { formatBestGain, formatBestValue, type PersonalBest } from './personal-bests';
import type { WeightUnit } from './weight-units';

/**
 * The Progress tab's pure logic, shared by web and app: this week as a
 * sentence, and the story of the client's training told as the moments
 * worth noticing (bests, streaks, finished weeks, milestones, notes from
 * the coach) with ordinary workouts folded in between.
 *
 * Built for adherence, not reporting: there's always a next step, every
 * win gets its own line, and a missed week leaves no scar on the page.
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

function sessionName(completion: WorkoutCompletion, plans: WorkoutPlan[]): string {
  const week = plans.find((p) => p.id === completion.planId)?.weeks.find((w) => w.id === completion.weekId);
  const dayIndex = week?.days.findIndex((d) => d.id === completion.dayId) ?? -1;
  return getWorkoutDisplayName(week?.days[dayIndex], dayIndex, completion);
}

/** One circle in this week's stepper */
export interface WeekSlot {
  state: 'done' | 'next' | 'upcoming';
  /** Under the circle: the weekday it was done ("Tue"), "Next", or nothing */
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
 * hasn't built it yet) it counts sessions since Monday against the target.
 */
export function describeThisWeek({
  plan,
  weekNumber,
  completions,
  target,
  now = new Date(),
}: {
  plan: WorkoutPlan | null;
  /** The plan week it is now (the week overview's) */
  weekNumber: number | null;
  completions: WorkoutCompletion[];
  /** Workouts a week, for when there's no plan week to count */
  target: number;
  now?: Date;
}): ThisWeek {
  const sessions = completedSessions(completions);
  const week = plan?.weeks.find((w) => w.weekNumber === weekNumber);

  let done: WorkoutCompletion[];
  let total = target;
  let nextUp: string | null = null;
  if (week && week.days.length > 0) {
    const days = [...week.days].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
    const byDay = new Map(sessions.filter((c) => c.weekId === week.id).map((c) => [c.dayId, c]));
    // Circles fill in the order the workouts were done, whatever their order in the plan
    done = completedSessions(days.flatMap((d) => byDay.get(d.id) ?? []));
    const i = days.findIndex((d) => !byDay.has(d.id));
    nextUp = i < 0 ? null : days[i].name || `Day ${i + 1}`;
    total = days.length;
  } else {
    const thisMonday = startOfWeek(now, { weekStartsOn: 1 }).getTime();
    done = sessions.filter((c) => weekStartOf(c.completedAt!).getTime() === thisMonday);
  }

  const completed = done.length;
  const slots: WeekSlot[] = Array.from({ length: Math.min(7, Math.max(total, completed)) }, (_, i) =>
    i < completed
      ? { state: 'done', label: format(parseISO(done[i].completedAt!), 'EEE') }
      : i === completed
        ? { state: 'next', label: 'Next' }
        : { state: 'upcoming', label: '' },
  );
  const base = { completed, target: total, slots };

  if (completed >= total) {
    return { ...base, lead: completed > total ? `${completed} done.` : `All ${total} done.`, rest: 'Week complete. Rest up.' };
  }
  if (completed > 0) {
    const left = total - completed;
    return { ...base, lead: `${completed} down.`, rest: `${left} to go${nextUp ? `. Next up, ${nextUp}.` : '.'}` };
  }
  if (sessions.length === 0) {
    return { ...base, lead: 'Fresh start.', rest: nextUp ? `First up, ${nextUp}.` : 'Your first workout kicks things off.' };
  }
  return { ...base, lead: 'New week.', rest: nextUp ? `First up, ${nextUp}.` : `${total} sessions to go.` };
}

export type MomentKind = 'best' | 'streak' | 'week' | 'milestone' | 'comeback' | 'coach' | 'quiet';

/** One line of the story */
export interface Moment {
  key: string;
  kind: MomentKind;
  /** ISO time it happened; the feed is newest first */
  at: string;
  /** "Today" · "Yesterday" · "Sunday" · "Oct 11"; empty for folded workouts */
  when: string;
  title: string;
  detail?: string;
  /** Folded ordinary workouts, newest first: "Upper B · Thu 15" */
  sessions?: string[];
}

/** "Today" · "Yesterday" · "Sunday" (this past week) · "Oct 11" · "Oct 11, 2025" */
export function formatMomentWhen(iso: string, now = new Date()): string {
  const date = parseISO(iso);
  const days = differenceInCalendarDays(now, date);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return format(date, 'EEEE');
  return format(date, date.getFullYear() === now.getFullYear() ? 'MMM d' : 'MMM d, yyyy');
}

/** Workout counts worth a line */
const isCountMilestone = (n: number) => n === 1 || n === 10 || n === 25 || (n >= 50 && n % 50 === 0);
/** Weeks-in-a-row runs worth a line */
const isStreakMilestone = (n: number) => n === 3 || n === 5 || (n >= 10 && n % 5 === 0);
/** Days off that make the next session a comeback */
const COMEBACK_DAYS = 14;

const listNames = (names: string[]) => {
  if (names.length <= 3) return names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  return `${names.slice(0, 2).join(', ')} and ${names.length - 2} more`;
};

const firstName = (name: string | null | undefined) => name?.trim().split(/\s+/)[0] || 'Your coach';

/** Within one moment in time, the bigger news reads first */
const RANK: Record<MomentKind, number> = { week: 0, streak: 1, best: 2, milestone: 3, comeback: 4, coach: 5, quiet: 6 };

/**
 * The client's training as a feed of moments, newest first. Ordinary
 * workouts between moments fold into one quiet "+ 2 workouts" line that
 * still lists them, so nothing logged is lost.
 */
export function buildProgressStory({
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
}): Moment[] {
  const sessions = completedSessions(completions);
  // Workouts older than the history we were given
  const before = Math.max(0, (totalWorkouts ?? sessions.length) - sessions.length);
  const moment = (m: Omit<Moment, 'when'>): Moment => ({ ...m, when: formatMomentWhen(m.at, now) });
  const moments: Moment[] = [];
  const notable = new Set<string>();

  const bestsBySession = new Map<string, PersonalBest[]>();
  for (const b of personalBests) bestsBySession.set(b.completionId, [...(bestsBySession.get(b.completionId) ?? []), b]);

  sessions.forEach((c, i) => {
    const at = c.completedAt!;
    const name = sessionName(c, plans);
    const mark = (m: Omit<Moment, 'when' | 'at'>) => {
      moments.push(moment({ ...m, at }));
      notable.add(c.id);
    };

    const bests = bestsBySession.get(c.id) ?? [];
    if (bests.length === 1) {
      const [b] = bests;
      mark({ key: `best-${c.id}`, kind: 'best', title: `New best on ${b.exerciseName}`, detail: `${formatBestValue(b, weightUnit)}, ${formatBestGain(b, weightUnit)}` });
    } else if (bests.length > 1) {
      mark({ key: `best-${c.id}`, kind: 'best', title: `${bests.length} new bests in ${name}`, detail: listNames(bests.map((b) => b.exerciseName)) });
    }

    const count = before + i + 1;
    if (isCountMilestone(count)) {
      mark(
        count === 1
          ? { key: `count-${c.id}`, kind: 'milestone', title: 'First workout logged', detail: `${name}. This is where it starts.` }
          : {
              key: `count-${c.id}`,
              kind: 'milestone',
              title: `${count} workouts logged`,
              // The first workout's date is only known when the history reaches it
              detail: before === 0 ? `Since ${format(parseISO(sessions[0].completedAt!), 'MMM d')}` : undefined,
            },
      );
    }

    const previous = sessions[i - 1];
    const gap = previous ? differenceInCalendarDays(parseISO(at), parseISO(previous.completedAt!)) : 0;
    if (gap >= COMEBACK_DAYS) {
      const weeks = Math.round(gap / 7);
      mark({ key: `back-${c.id}`, kind: 'comeback', title: 'Back at it', detail: `${name}, after ${weeks} ${weeks === 1 ? 'week' : 'weeks'} off` });
    }
  });

  // Weeks in a row: a line when a run reaches a milestone, on that week's first session
  const firstInWeek = new Map<number, WorkoutCompletion>();
  for (const c of sessions) {
    const week = weekStartOf(c.completedAt!).getTime();
    if (!firstInWeek.has(week)) firstInWeek.set(week, c);
  }
  let run = 0;
  // Longest of the runs before this one, so a run beating it can say so
  let longestBefore = 0;
  let runStart: number | null = null;
  let lastWeek: number | null = null;
  // With older history cut off, a run starting in the first week we have may
  // have started earlier: its length is unknown, so it gets no lines
  const edgeWeek = before > 0 ? firstInWeek.keys().next().value : undefined;
  for (const [week, c] of firstInWeek) {
    const continues = lastWeek != null && addWeeks(new Date(lastWeek), 1).getTime() === week;
    if (!continues) {
      longestBefore = Math.max(longestBefore, run);
      run = 0;
      runStart = week;
    }
    run++;
    lastWeek = week;
    if (isStreakMilestone(run) && runStart !== edgeWeek) {
      moments.push(
        moment({
          key: `streak-${week}`,
          kind: 'streak',
          at: c.completedAt!,
          title: `${run} weeks in a row`,
          detail: longestBefore >= 2 && run > longestBefore ? 'Your longest run yet.' : `Every week since ${format(new Date(runStart!), 'MMM d')}`,
        }),
      );
      notable.add(c.id);
    }
  }

  // Every session of a plan week done, marked on the one that finished it
  for (const plan of plans) {
    for (const week of plan.weeks) {
      if (week.days.length === 0) continue;
      const inWeek = sessions.filter((c) => c.planId === plan.id && c.weekId === week.id);
      if (!week.days.every((d) => inWeek.some((c) => c.dayId === d.id))) continue;
      const last = inWeek[inWeek.length - 1];
      moments.push(
        moment({
          key: `week-${week.id}`,
          kind: 'week',
          at: last.completedAt!,
          title: `Finished Week ${week.weekNumber}`,
          detail: `${plan.name} · all ${week.days.length} sessions`,
        }),
      );
      notable.add(last.id);
    }
  }

  // The coach's replies: progress the client can tie to their coach
  for (const ci of checkIns) {
    if (ci.status !== 'completed' || !ci.coachResponse?.trim() || !ci.completedAt) continue;
    moments.push(moment({ key: `coach-${ci.id}`, kind: 'coach', at: ci.completedAt, title: `${firstName(coachName)} on your check-in`, detail: ci.coachResponse.trim() }));
  }

  // Newest first, ordinary workouts folded into the gaps between moments
  type Item = { at: number; rank: number; moment?: Moment; plain?: WorkoutCompletion };
  const items: Item[] = [
    ...moments.map((m) => ({ at: parseISO(m.at).getTime(), rank: RANK[m.kind], moment: m })),
    ...sessions.filter((c) => !notable.has(c.id)).map((c) => ({ at: parseISO(c.completedAt!).getTime(), rank: RANK.quiet, plain: c })),
  ].sort((a, b) => b.at - a.at || a.rank - b.rank);

  const story: Moment[] = [];
  let folded: WorkoutCompletion[] = [];
  const flush = () => {
    if (folded.length === 0) return;
    const names = folded.map((c) => `${sessionName(c, plans)} · ${format(parseISO(c.completedAt!), 'EEE d')}`);
    story.push({
      key: `quiet-${folded[0].id}`,
      kind: 'quiet',
      at: folded[0].completedAt!,
      when: '',
      title: folded.length === 1 ? `+ ${sessionName(folded[0], plans)}` : `+ ${folded.length} workouts`,
      sessions: names,
    });
    folded = [];
  };
  for (const item of items) {
    if (item.plain) folded.push(item.plain);
    else {
      flush();
      story.push(item.moment!);
    }
  }
  flush();
  return story;
}

/** Moments shown before "Show earlier" */
export const STORY_PAGE_SIZE = 10;

/** The feed before there's anything in it */
export const STORY_EMPTY_TEXT = 'Your wins show up here: new bests, streaks, finished weeks, and notes from your coach.';

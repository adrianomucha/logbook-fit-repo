import { isToday } from 'date-fns';
import {
  WorkoutWeek,
  WorkoutDay,
  WorkoutCompletion,
  DayStatus,
} from './types';
import { calendarDayOfInstant, dayNumberToDateKey, localDayNumber, mondayOf } from './timezone';

// Info for a single workout in the week's sequential checklist.
// Workouts are no longer mapped to calendar weekdays — they're an ordered
// list the client completes in sequence, whenever they train.
export interface WeekDayInfo {
  workoutDay: WorkoutDay;   // The workout (every entry is a workout — no rest slots)
  orderIndex: number;       // 1-based position within the week
  status: DayStatus;        // 'COMPLETED' | 'CURRENT' | 'UPCOMING'
  completion?: WorkoutCompletion;
  isInteractive: boolean;   // Always true — any workout can be opened
}

/**
 * A day counts as a workout only once it has exercises. New plans are
 * scaffolded with empty "Day N" slots for the coach to fill; one left empty
 * is nothing to train, so no surface may offer it, count it or let it be
 * finished.
 */
export function isWorkoutDay(day: Pick<WorkoutDay, 'exercises'>): boolean {
  return day.exercises.length > 0;
}

/**
 * Raw (unclamped) plan week, counted on the CLIENT's calendar: week 1 is the
 * Monday-to-Sunday week holding the plan's start date in their timezone
 * (UTC when unknown). Zero or less means the plan hasn't started yet: a
 * plan the coach set to start next Monday.
 *
 * Every caller passes the client's timezone, the coach's screens included,
 * so the client and their coach can never disagree about which week it is,
 * and a Sunday-evening workout in Los Angeles lands in Sunday's week.
 */
export function getRawWeekNumber(
  planStartDate: string | Date,
  timeZone: string | null | undefined,
  now: Date = new Date()
): number {
  const startMonday = mondayOf(startDay(planStartDate, timeZone));
  const today = localDayNumber(now, timeZone);
  return Math.floor((today - startMonday) / 7) + 1;
}

/**
 * Where the client is relative to the plan's span. UPCOMING: set to start
 * on a later Monday. Drives the coach's "assign the next block" nudge and
 * the client's not-started and plan-complete states.
 */
export type PlanProgressStatus = 'UPCOMING' | 'ACTIVE' | 'FINAL_WEEK' | 'ENDED';

export function getPlanProgressStatus(
  planStartDate: string | Date,
  durationWeeks: number,
  timeZone: string | null | undefined,
  now: Date = new Date()
): PlanProgressStatus {
  const raw = getRawWeekNumber(planStartDate, timeZone, now);
  if (raw < 1) return 'UPCOMING';
  if (raw > durationWeeks) return 'ENDED';
  if (raw === durationWeeks) return 'FINAL_WEEK';
  return 'ACTIVE';
}

/**
 * The plan week to show: the raw week clamped to the plan, so a plan that
 * hasn't started shows week 1 and an ended one its last week.
 * Note: this advances the *displayed week* over time; it does NOT pin
 * individual workouts to weekdays.
 */
export function getCurrentWeekNumber(
  planStartDate: string | Date,
  durationWeeks: number,
  timeZone: string | null | undefined,
  now: Date = new Date()
): number {
  return Math.max(1, Math.min(getRawWeekNumber(planStartDate, timeZone, now), durationWeeks));
}

/**
 * The plan's first day as a day number. Starts saved as a calendar date
 * (see plan-start.ts) read the same everywhere; older starts, stored as the
 * moment of assignment, fall on whatever day that was where the client is.
 */
function startDay(planStartDate: string | Date, timeZone: string | null | undefined): number {
  const date = new Date(planStartDate);
  return calendarDayOfInstant(date) ?? localDayNumber(date, timeZone);
}

/** The day the plan started (or starts) on the client's calendar: "2026-10-26". */
export function getPlanStartDay(planStartDate: string | Date, timeZone: string | null | undefined): string {
  return dayNumberToDateKey(startDay(planStartDate, timeZone));
}

/**
 * The Monday a plan begins ("2026-10-26") while it's still ahead; null once
 * it has started. A plan only starts in the future on a Monday.
 */
export function getPlanStartsOn(
  planStartDate: string | Date,
  timeZone: string | null | undefined,
  now: Date = new Date()
): string | null {
  if (getRawWeekNumber(planStartDate, timeZone, now) >= 1) return null;
  return dayNumberToDateKey(mondayOf(startDay(planStartDate, timeZone)));
}

/** The plan's last day: the Sunday that closes its final week ("2026-11-22"). */
export function getPlanEndsOn(
  planStartDate: string | Date,
  durationWeeks: number,
  timeZone: string | null | undefined
): string {
  const startMonday = mondayOf(startDay(planStartDate, timeZone));
  return dayNumberToDateKey(startMonday + durationWeeks * 7 - 1);
}

/**
 * Build the week's workouts as an ordered checklist, leaving out days with
 * no exercises. The first not-yet-completed workout is marked CURRENT (the "do this next"
 * highlight); the rest are UPCOMING. Completed workouts are COMPLETED.
 */
export function getWeekDays(
  week: WorkoutWeek,
  completions: WorkoutCompletion[],
  clientId: string
): WeekDayInfo[] {
  const sorted = week.days
    .filter(isWorkoutDay)
    .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));

  let currentAssigned = false;

  return sorted.map((workoutDay, i) => {
    const completion = completions.find(
      (c) =>
        c.clientId === clientId &&
        c.weekId === week.id &&
        c.dayId === workoutDay.id
    );

    const isDone = completion?.status === 'COMPLETED';

    let status: DayStatus;
    if (isDone) {
      status = 'COMPLETED';
    } else if (!currentAssigned) {
      status = 'CURRENT';
      currentAssigned = true;
    } else {
      status = 'UPCOMING';
    }

    return {
      workoutDay,
      orderIndex: workoutDay.orderIndex ?? i + 1,
      status,
      completion,
      isInteractive: true,
    };
  });
}

/**
 * Get week progress stats
 */
export function getWeekProgress(
  weekDays: WeekDayInfo[]
): { completed: number; total: number; percentage: number } {
  const total = weekDays.length;
  const completed = weekDays.filter((d) => d.status === 'COMPLETED').length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { completed, total, percentage };
}

/**
 * Get the workout the client should focus on: a workout they're mid-way
 * through takes priority (they can start any workout from the weekly view,
 * not just the first), then a workout they finished today — so the Today
 * card stays on "Done" and the feedback prompt for the rest of the day
 * instead of immediately advancing to the next workout in the sequence —
 * then the next uncompleted one, or — if the whole week is done — the last
 * workout (so the completed state and feedback prompt still render).
 */
export function getActiveWorkout(weekDays: WeekDayInfo[]): WeekDayInfo | null {
  if (weekDays.length === 0) return null;

  // "Today" is the client's local calendar day: completedAt is an instant,
  // and the day it falls on is judged from where the client is now.
  const completedToday = weekDays
    .filter(
      (d) =>
        d.completion?.status === 'COMPLETED' &&
        d.completion.completedAt &&
        isToday(new Date(d.completion.completedAt))
    )
    .sort(
      (a, b) =>
        new Date(b.completion!.completedAt!).getTime() -
        new Date(a.completion!.completedAt!).getTime()
    )[0];

  return (
    weekDays.find((d) => d.completion?.status === 'IN_PROGRESS') ??
    completedToday ??
    weekDays.find((d) => d.status === 'CURRENT') ??
    weekDays[weekDays.length - 1]
  );
}

import {
  startOfWeek,
  differenceInDays,
  startOfDay,
} from 'date-fns';
import {
  WorkoutWeek,
  WorkoutDay,
  WorkoutCompletion,
  DayStatus,
} from '@/types';

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
 * Raw (unclamped) week number since the plan started.
 * Week 1 starts on the Monday of (or before) planStartDate.
 *
 * NOTE: this is evaluated in the local timezone of whatever machine runs it,
 * so the server and a client's browser can disagree near week boundaries.
 * The API's week-overview response is the source of truth for "which week is
 * it" — client views must consume `weekOverview.weekNumber` rather than
 * calling this directly.
 */
export function getRawWeekNumber(planStartDate: string | Date): number {
  const startMonday = startOfWeek(new Date(planStartDate), { weekStartsOn: 1 });
  const daysDiff = differenceInDays(startOfDay(new Date()), startMonday);
  return Math.floor(daysDiff / 7) + 1;
}

/**
 * Where the client is relative to the plan's end — drives the coach's
 * "assign the next block" nudge and the client's plan-complete state.
 */
export type PlanProgressStatus = 'ACTIVE' | 'FINAL_WEEK' | 'ENDED';

export function getPlanProgressStatus(
  planStartDate: string | Date,
  durationWeeks: number
): PlanProgressStatus {
  const raw = getRawWeekNumber(planStartDate);
  if (raw > durationWeeks) return 'ENDED';
  if (raw === durationWeeks) return 'FINAL_WEEK';
  return 'ACTIVE';
}

/**
 * Calculate the current week number based on planStartDate.
 * Note: this advances the *displayed week* over time; it does NOT pin
 * individual workouts to weekdays.
 * @returns 1-indexed week number, clamped to plan duration
 */
export function getCurrentWeekNumber(
  planStartDate: string,
  durationWeeks: number
): number {
  return Math.max(1, Math.min(getRawWeekNumber(planStartDate), durationWeeks));
}

/**
 * Build the week's workouts as an ordered checklist.
 * The first not-yet-completed workout is marked CURRENT (the "do this next"
 * highlight); the rest are UPCOMING. Completed workouts are COMPLETED.
 */
export function getWeekDays(
  week: WorkoutWeek,
  completions: WorkoutCompletion[],
  clientId: string
): WeekDayInfo[] {
  const sorted = [...week.days].sort(
    (a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)
  );

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
 * not just the first), then the next uncompleted one, or — if the whole week
 * is done — the last workout (so the completed state and feedback prompt
 * still render).
 */
export function getActiveWorkout(weekDays: WeekDayInfo[]): WeekDayInfo | null {
  if (weekDays.length === 0) return null;
  return (
    weekDays.find((d) => d.completion?.status === 'IN_PROGRESS') ??
    weekDays.find((d) => d.status === 'CURRENT') ??
    weekDays[weekDays.length - 1]
  );
}

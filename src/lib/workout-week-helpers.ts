import {
  startOfWeek,
  addDays,
  differenceInDays,
  isToday as isTodayDateFns,
  isBefore,
  startOfDay,
  format,
} from 'date-fns';
import {
  WorkoutWeek,
  WorkoutDay,
  WorkoutCompletion,
  DayStatus,
} from '@/types';

// Interface for a day in the weekly overview
export interface WeekDayInfo {
  date: Date;
  dayOfWeek: string;        // "Mon", "Tue", etc.
  dayNumber: number;        // 1-7 (Monday=1)
  workoutDay?: WorkoutDay;  // The workout for this day (undefined if rest)
  status: DayStatus;
  completion?: WorkoutCompletion;
  isInteractive: boolean;   // Can the user tap on this card?
}

/**
 * Calculate the current week number based on planStartDate
 * Week 1 starts on the Monday of (or before) planStartDate
 * @returns 1-indexed week number, clamped to plan duration
 */
export function getCurrentWeekNumber(
  planStartDate: string,
  durationWeeks: number
): number {
  const startDate = new Date(planStartDate);
  const startMonday = startOfWeek(startDate, { weekStartsOn: 1 });
  const today = startOfDay(new Date());

  const daysDiff = differenceInDays(today, startMonday);
  const weekNumber = Math.floor(daysDiff / 7) + 1;

  // Clamp to valid range
  return Math.max(1, Math.min(weekNumber, durationWeeks));
}

/**
 * Get the Monday of the current week
 */
export function getCurrentWeekMonday(): Date {
  return startOfWeek(new Date(), { weekStartsOn: 1 });
}

/**
 * Get the Monday of the week containing planStartDate
 */
export function getPlanStartMonday(planStartDate: string): Date {
  const startDate = new Date(planStartDate);
  return startOfWeek(startDate, { weekStartsOn: 1 });
}

/**
 * Check if a date is today
 */
export function isToday(date: Date): boolean {
  return isTodayDateFns(date);
}

/**
 * Check if a date is in the past (before today)
 */
export function isPast(date: Date): boolean {
  const today = startOfDay(new Date());
  return isBefore(startOfDay(date), today);
}

/**
 * Determine the status of a day card
 */
export function getDayStatus(
  dayDate: Date,
  workoutDay: WorkoutDay | undefined,
  completion?: WorkoutCompletion
): DayStatus {
  // Rest day
  if (!workoutDay || workoutDay.isRestDay) {
    return 'REST';
  }

  // Today
  if (isToday(dayDate)) {
    // Check if completed today
    if (completion?.status === 'COMPLETED') {
      return 'COMPLETED';
    }
    return 'TODAY';
  }

  // Past day
  if (isPast(dayDate)) {
    if (completion?.status === 'COMPLETED') {
      return 'COMPLETED';
    }
    return 'MISSED';
  }

  // Future day
  return 'UPCOMING';
}

/**
 * Get the 7 days for weekly overview (Mon-Sun)
 * Maps workout days to calendar days based on plan structure
 */
export function getWeekDays(
  planStartDate: string,
  week: WorkoutWeek,
  completions: WorkoutCompletion[],
  clientId: string
): WeekDayInfo[] {
  const planStartMonday = getPlanStartMonday(planStartDate);
  const currentWeekNumber = week.weekNumber;

  // Calculate the Monday of the target week
  const weekMonday = addDays(planStartMonday, (currentWeekNumber - 1) * 7);

  // Filter workout days (non-rest days)
  const workoutDays = week.days.filter((d) => !d.isRestDay);

  // Build the 7-day array
  const days: WeekDayInfo[] = [];

  for (let i = 0; i < 7; i++) {
    const date = addDays(weekMonday, i);
    const dayOfWeek = format(date, 'EEE'); // Mon, Tue, etc.
    const dayNumber = i + 1; // 1 = Monday, 7 = Sunday

    // Map workout days to Mon, Tue, Wed, etc.
    // If workoutsPerWeek = 3, we assign workouts to Mon, Tue, Wed
    const workoutDay = i < workoutDays.length ? workoutDays[i] : undefined;

    // Find completion for this specific day
    const completion = completions.find(
      (c) =>
        c.clientId === clientId &&
        c.weekId === week.id &&
        c.dayId === workoutDay?.id
    );

    const status = getDayStatus(date, workoutDay, completion);

    // Determine if interactive - all workout days (today, completed, past) are tappable
    // Only UPCOMING and REST days are non-interactive
    const isInteractive =
      status === 'TODAY' || status === 'COMPLETED' || status === 'MISSED';

    days.push({
      date,
      dayOfWeek,
      dayNumber,
      workoutDay,
      status,
      completion,
      isInteractive,
    });
  }

  return days;
}

/**
 * Get week progress stats
 */
export function getWeekProgress(
  weekDays: WeekDayInfo[]
): { completed: number; total: number; percentage: number } {
  const workoutDays = weekDays.filter((d) => d.status !== 'REST');
  const completed = workoutDays.filter((d) => d.status === 'COMPLETED').length;
  const total = workoutDays.length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { completed, total, percentage };
}

/**
 * Format a date as "Mon, Feb 3"
 */
export function formatDayDate(date: Date): string {
  return format(date, 'EEE, MMM d');
}

/**
 * Format just the date number "3"
 */
export function formatDayNumber(date: Date): string {
  return format(date, 'd');
}

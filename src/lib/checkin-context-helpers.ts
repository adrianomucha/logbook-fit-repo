import { CheckIn, CompletedWorkout } from '@/types';
import { startOfWeek, isWithinInterval, subDays } from 'date-fns';

/**
 * Get recent completed check-ins for a client, sorted newest first
 * Excludes the current check-in if provided
 */
export function getRecentCheckIns(
  clientId: string,
  checkIns: CheckIn[],
  excludeId?: string,
  limit = 3
): CheckIn[] {
  return checkIns
    .filter(
      (c) =>
        c.clientId === clientId &&
        c.status === 'completed' &&
        c.id !== excludeId
    )
    .sort(
      (a, b) =>
        new Date(b.completedAt || b.date).getTime() -
        new Date(a.completedAt || a.date).getTime()
    )
    .slice(0, limit);
}

/**
 * Get the most recent completed check-in from the current week (Mon-Sun)
 * Returns null if no check-in was completed this week
 */
export function getThisWeekCompletedCheckIn(
  clientId: string,
  checkIns: CheckIn[]
): CheckIn | null {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday

  const thisWeekCheckIns = checkIns
    .filter((c) => {
      if (c.clientId !== clientId || c.status !== 'completed') return false;
      const completedDate = new Date(c.completedAt || c.date);
      return isWithinInterval(completedDate, { start: weekStart, end: now });
    })
    .sort(
      (a, b) =>
        new Date(b.completedAt || b.date).getTime() -
        new Date(a.completedAt || a.date).getTime()
    );

  return thisWeekCheckIns[0] || null;
}

/**
 * Calculate workout completion for the week of a check-in
 * Looks at workouts completed in the 7 days before the check-in date
 */
export function getWorkoutCompletionForCheckIn(
  checkIn: CheckIn,
  completedWorkouts: CompletedWorkout[],
  expectedWorkoutsPerWeek?: number
): { completed: number; total: number } {
  const checkInDate = new Date(checkIn.date);
  const weekStart = subDays(checkInDate, 7);

  const weekWorkouts = completedWorkouts.filter((w) => {
    if (w.clientId !== checkIn.clientId) return false;
    const workoutDate = new Date(w.completedAt);
    return isWithinInterval(workoutDate, { start: weekStart, end: checkInDate });
  });

  // Count unique workout days (a client might log multiple exercises per workout)
  const uniqueWorkoutDays = new Set(
    weekWorkouts.map((w) => `${w.planId}-${w.weekId}-${w.dayId}`)
  );

  return {
    completed: uniqueWorkoutDays.size,
    total: expectedWorkoutsPerWeek || 4, // Default to 4 if not specified
  };
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

/**
 * Get the count of completed check-ins beyond a limit
 * Used to show "Show Older" button with count
 */
export function getOlderCheckInsCount(
  clientId: string,
  checkIns: CheckIn[],
  excludeId?: string,
  alreadyShown = 3
): number {
  const total = checkIns.filter(
    (c) =>
      c.clientId === clientId &&
      c.status === 'completed' &&
      c.id !== excludeId
  ).length;

  return Math.max(0, total - alreadyShown);
}

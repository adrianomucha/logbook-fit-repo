import { Client, WorkoutPlan, CompletedWorkout } from '@/types';
import { startOfWeek, endOfWeek, isWithinInterval, subWeeks } from 'date-fns';

/**
 * Calculates consecutive missed workouts for a client
 *
 * Logic:
 * - SKIP the current week (unfair to judge partial week)
 * - Start from last complete week (week -1)
 * - Get expected workouts from plan.workoutsPerWeek
 * - Count completed workouts per week
 * - If completed < expected, count as "missed week"
 * - Continue backwards until we find a complete week
 *
 * Returns: Number of consecutive COMPLETE weeks with missed workouts
 */
export function getConsecutiveMissedWorkouts(
  client: Client,
  plan: WorkoutPlan | undefined,
  completedWorkouts: CompletedWorkout[]
): number {
  if (!plan || !plan.workoutsPerWeek) return 0;

  let missedWeeks = 0;
  // IMPORTANT: Set week to start on Monday (weekStartsOn: 1), not Sunday (default 0)
  const weekOptions = { weekStartsOn: 1 as const };
  let currentWeekStart = startOfWeek(new Date(), weekOptions);

  const weeklyData: any[] = [];

  // Check up to 8 weeks back, STARTING FROM LAST WEEK (i=1, not i=0)
  // i=0 would be current week (unfair to judge), so we skip it
  for (let i = 1; i < 9; i++) {
    const weekStart = subWeeks(currentWeekStart, i);
    const weekEnd = endOfWeek(weekStart, weekOptions);

    const workoutsThisWeek = completedWorkouts.filter(w =>
      w.clientId === client.id &&
      isWithinInterval(new Date(w.completedAt), { start: weekStart, end: weekEnd })
    );

    const completedThisWeek = workoutsThisWeek.length;
    const expected = plan.workoutsPerWeek;

    weeklyData.push({
      weekNum: i,
      weekLabel: i === 1 ? 'Last week' : `${i} weeks ago`,
      start: weekStart.toISOString().split('T')[0],
      end: weekEnd.toISOString().split('T')[0],
      completed: completedThisWeek,
      expected,
      isMissed: completedThisWeek < expected,
      workoutDates: workoutsThisWeek.map(w => w.completedAt.split('T')[0])
    });

    if (completedThisWeek < expected) {
      missedWeeks++;
    } else {
      // Found a complete week, stop counting
      break;
    }
  }

  return missedWeeks;
}

export function isAtRiskWorkouts(
  client: Client,
  plan: WorkoutPlan | undefined,
  completedWorkouts: CompletedWorkout[]
): boolean {
  const missedWeeks = getConsecutiveMissedWorkouts(client, plan, completedWorkouts);
  return missedWeeks >= 2;
}

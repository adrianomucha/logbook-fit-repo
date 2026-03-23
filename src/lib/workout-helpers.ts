import type { WorkoutDay, WorkoutWeek } from '../types';

/**
 * Generates workout days for a new week based on workouts per week
 */
export function generateDaysForWeek(workoutsPerWeek: number): WorkoutDay[] {
  const days: WorkoutDay[] = [];

  // Generate workout days only (no rest day records)
  for (let i = 1; i <= workoutsPerWeek; i++) {
    days.push({
      id: `day-${Date.now()}-${i}`,
      orderIndex: i,
      name: `Day ${i}`,
      exercises: [],
    });
  }

  return days;
}

/**
 * Duplicates a week with a new week number and fresh IDs
 * Note: Does not copy exercises, only the structure
 */
export function duplicateWeek(week: WorkoutWeek, newWeekNumber: number): WorkoutWeek {
  return {
    id: `week-${Date.now()}`,
    weekNumber: newWeekNumber,
    days: week.days.map(day => ({
      ...day,
      id: `day-${Date.now()}-${Math.random()}`,
      exercises: [], // Don't copy exercises, just structure
    })),
  };
}

/**
 * Moves a week from one index to another and renumbers all weeks
 */
export function moveWeek(weeks: WorkoutWeek[], fromIndex: number, toIndex: number): WorkoutWeek[] {
  const newWeeks = [...weeks];
  const [movedWeek] = newWeeks.splice(fromIndex, 1);
  newWeeks.splice(toIndex, 0, movedWeek);

  // Renumber weeks
  return newWeeks.map((week, idx) => ({
    ...week,
    weekNumber: idx + 1,
  }));
}

/**
 * Duplicates a workout day with a new ID
 */
export function duplicateDay(day: WorkoutDay): WorkoutDay {
  return {
    ...day,
    id: `day-${Date.now()}-${Math.random()}`,
    exercises: [], // Don't copy exercises, just structure
  };
}

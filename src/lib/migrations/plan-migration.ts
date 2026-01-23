import type { WorkoutPlan } from '../../types';

export function migratePlansToV2(plans: WorkoutPlan[]): WorkoutPlan[] {
  return plans.map((plan) => {
    const migratedPlan = { ...plan };

    // Add emoji if missing
    if (!migratedPlan.emoji) {
      migratedPlan.emoji = '💪';
    }

    // Calculate durationWeeks if missing
    if (!migratedPlan.durationWeeks && migratedPlan.weeks.length > 0) {
      migratedPlan.durationWeeks = migratedPlan.weeks.length;
    }

    // Calculate workoutsPerWeek if missing
    if (!migratedPlan.workoutsPerWeek && migratedPlan.weeks.length > 0) {
      const firstWeek = migratedPlan.weeks[0];
      if (firstWeek && firstWeek.days) {
        // Count non-rest days
        const workoutDays = firstWeek.days.filter((day) => {
          // If isRestDay is set, use it
          if (day.isRestDay !== undefined) {
            return !day.isRestDay;
          }
          // Otherwise, determine by name or exercises
          const isRest = day.name.toLowerCase().includes('rest') || day.exercises.length === 0;
          return !isRest;
        }).length;

        migratedPlan.workoutsPerWeek = workoutDays || 4; // Default to 4 if can't determine
      } else {
        migratedPlan.workoutsPerWeek = 4; // Default fallback
      }
    }

    // Add isRestDay to all days if missing
    migratedPlan.weeks = migratedPlan.weeks.map((week) => ({
      ...week,
      days: week.days.map((day) => ({
        ...day,
        isRestDay:
          day.isRestDay !== undefined
            ? day.isRestDay
            : day.name.toLowerCase().includes('rest') || day.exercises.length === 0,
      })),
    }));

    return migratedPlan;
  });
}

export function needsMigration(plans: WorkoutPlan[]): boolean {
  return plans.some(
    (plan) =>
      !plan.emoji ||
      !plan.durationWeeks ||
      !plan.workoutsPerWeek ||
      plan.weeks.some((week) => week.days.some((day) => day.isRestDay === undefined))
  );
}

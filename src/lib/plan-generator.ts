import type { PlanSetupFormData, WorkoutPlan, WorkoutWeek, WorkoutDay } from '../types';

export function generatePlanStructure(formData: PlanSetupFormData): WorkoutPlan {
  const planId = `plan-${Date.now()}`;
  const now = new Date().toISOString();

  // Generate weeks
  const weeks: WorkoutWeek[] = [];
  for (let weekNum = 1; weekNum <= formData.durationWeeks; weekNum++) {
    const weekId = `week-${planId}-${weekNum}`;
    const days: WorkoutDay[] = [];

    // Generate workout days
    for (let dayNum = 1; dayNum <= formData.workoutsPerWeek; dayNum++) {
      days.push({
        id: `day-${weekId}-${dayNum}`,
        name: `Workout ${dayNum}`,
        exercises: [],
        isRestDay: false,
      });
    }

    // Generate rest days
    const restDays = 7 - formData.workoutsPerWeek;
    for (let restNum = 1; restNum <= restDays; restNum++) {
      days.push({
        id: `day-${weekId}-rest-${restNum}`,
        name: 'Rest Day',
        exercises: [],
        isRestDay: true,
      });
    }

    weeks.push({
      id: weekId,
      weekNumber: weekNum,
      days,
    });
  }

  return {
    id: planId,
    name: formData.name.trim(),
    description: formData.description.trim() || undefined,
    emoji: formData.emoji,
    durationWeeks: formData.durationWeeks,
    workoutsPerWeek: formData.workoutsPerWeek,
    weeks,
    createdAt: now,
    updatedAt: now,
  };
}

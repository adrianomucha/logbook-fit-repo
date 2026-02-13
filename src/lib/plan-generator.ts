import type { PlanSetupFormData, WorkoutPlan, WorkoutWeek, WorkoutDay, Exercise } from '../types';

/**
 * Options for deep copying a plan
 */
export interface DeepCopyPlanOptions {
  /** If true, creates a client instance (isTemplate: false) with sourceTemplateId */
  makeInstance?: boolean;
  /** Custom name for the copy (defaults to "[Original Name] (Copy)" for templates) */
  newName?: string;
}

/**
 * Deep copies a workout plan with new IDs for all nested structures.
 * Used for:
 * - Duplicating a template (makeInstance: false) - creates a new template
 * - Forking for a client (makeInstance: true) - creates a client instance
 */
export function deepCopyPlan(
  sourcePlan: WorkoutPlan,
  options?: DeepCopyPlanOptions
): WorkoutPlan {
  const now = new Date().toISOString();
  const newPlanId = `plan-${Date.now()}`;
  const makeInstance = options?.makeInstance ?? false;

  // Deep copy all weeks, days, and exercises with new IDs
  const copiedWeeks: WorkoutWeek[] = sourcePlan.weeks.map((week, weekIdx) => {
    const newWeekId = `week-${newPlanId}-${weekIdx + 1}`;

    return {
      ...week,
      id: newWeekId,
      days: week.days.map((day, dayIdx) => {
        const newDayId = `day-${newWeekId}-${dayIdx + 1}`;

        return {
          ...day,
          id: newDayId,
          exercises: day.exercises.map((exercise): Exercise => ({
            ...exercise,
            id: `ex-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            // Reset completion status for new copy
            completed: undefined,
          })),
        };
      }),
    };
  });

  // Determine the name for the copy
  const copyName = options?.newName ?? (
    makeInstance
      ? sourcePlan.name  // Instances keep the same name
      : `${sourcePlan.name} (Copy)`  // Duplicates get "(Copy)" suffix
  );

  return {
    ...sourcePlan,
    id: newPlanId,
    name: copyName,
    weeks: copiedWeeks,
    createdAt: now,
    updatedAt: now,
    // Template/Instance fields
    isTemplate: !makeInstance,
    sourceTemplateId: makeInstance ? sourcePlan.id : undefined,
    archivedAt: undefined,
  };
}

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
    isTemplate: true,  // New plans are always templates
  };
}

import type { WorkoutPlan } from '../../types';

/**
 * Migrates existing plans to the template/instance model.
 * Marks all existing plans as templates (isTemplate: true).
 *
 * This migration runs once on first load after the template model is introduced.
 * After this, new plans created via generatePlanStructure() will have isTemplate: true,
 * and client instances created via deepCopyPlan() will have isTemplate: false.
 */
export function migratePlansToTemplateModel(plans: WorkoutPlan[]): WorkoutPlan[] {
  return plans.map((plan) => ({
    ...plan,
    // If isTemplate is not set, this is an existing plan that should become a template
    isTemplate: plan.isTemplate ?? true,
    // Ensure other template fields exist
    sourceTemplateId: plan.sourceTemplateId,
    archivedAt: plan.archivedAt,
  }));
}

/**
 * Checks if any plans need the template migration.
 * Returns true if any plan is missing the isTemplate field.
 */
export function needsTemplateMigration(plans: WorkoutPlan[]): boolean {
  return plans.some((plan) => plan.isTemplate === undefined);
}

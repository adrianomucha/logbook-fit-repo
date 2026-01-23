import type { PlanSetupFormData, PlanSetupFormErrors } from '../../types';

export function validatePlanName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return 'Plan name is required';
  if (trimmed.length < 3) return 'Plan name must be at least 3 characters';
  if (trimmed.length > 50) return 'Plan name cannot exceed 50 characters';
  return null;
}

export function validateDescription(description: string): string | null {
  if (description.length > 200) {
    return 'Description cannot exceed 200 characters';
  }
  return null;
}

export function validateDuration(weeks: number): string | null {
  if (!weeks || weeks < 1 || weeks > 12) {
    return 'Duration must be between 1-12 weeks';
  }
  return null;
}

export function validateWorkoutsPerWeek(count: number): string | null {
  if (!count || count < 1 || count > 7) {
    return 'Must be between 1-7 workouts per week';
  }
  return null;
}

export function validatePlanSetupForm(data: PlanSetupFormData): PlanSetupFormErrors {
  const errors: PlanSetupFormErrors = {};

  const nameError = validatePlanName(data.name);
  if (nameError) errors.name = nameError;

  const descriptionError = validateDescription(data.description);
  if (descriptionError) errors.description = descriptionError;

  const durationError = validateDuration(data.durationWeeks);
  if (durationError) errors.durationWeeks = durationError;

  const workoutsError = validateWorkoutsPerWeek(data.workoutsPerWeek);
  if (workoutsError) errors.workoutsPerWeek = workoutsError;

  return errors;
}

export function hasValidationErrors(errors: PlanSetupFormErrors): boolean {
  return Object.keys(errors).length > 0;
}

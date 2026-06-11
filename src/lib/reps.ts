/**
 * Rep-range helpers. A prescription is stored as `reps` (lower bound / exact
 * count) plus an optional `repsMax` (upper bound). The UI works with a single
 * display/edit string like "6-8" or "8".
 */

/** Format a stored reps/repsMax pair into a display string: "6-8" or "8". */
export function formatReps(reps: number, repsMax?: number | null): string {
  if (repsMax != null && repsMax > reps) return `${reps}-${repsMax}`;
  return String(reps);
}

/**
 * Parse a coach-entered reps string into a stored pair. Tolerates "6-8",
 * "6 - 8", "8", "8 reps", and empty input. Returns reps=null when there's no
 * number (callers fall back to a default), and collapses to a single value when
 * the two bounds are equal.
 */
export function parseRepsInput(input: string | number | null | undefined): {
  reps: number | null;
  repsMax: number | null;
} {
  const nums = String(input ?? '').match(/\d+/g)?.map(Number) ?? [];
  if (nums.length === 0) return { reps: null, repsMax: null };
  if (nums.length === 1) return { reps: nums[0], repsMax: null };
  const min = Math.min(nums[0], nums[1]);
  const max = Math.max(nums[0], nums[1]);
  return { reps: min, repsMax: max > min ? max : null };
}

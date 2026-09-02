/**
 * Prescription helpers. A prescription is stored as `reps` (lower bound / exact
 * count) plus an optional `repsMax` (upper bound). The UI works with a single
 * display/edit string like "6-8" or "8".
 *
 * Time-based exercises (planks, carries, cardio intervals) reuse the same
 * columns with `trackingType = 'TIME'`: the stored integers are seconds and the
 * display strings look like "60s", "1m 30s", "20-30 min".
 */

export type TrackingType = 'REPS' | 'TIME';

/** Format a duration in seconds: 45 → "45s", 120 → "2 min", 90 → "1m 30s". */
export function formatDuration(totalSeconds: number): string {
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return s === 0 ? `${m} min` : `${m}m ${s}s`;
}

/** Format a duration range compactly: "30-60s", "20-30 min", "45s-1m 30s". */
function formatDurationRange(minSec: number, maxSec: number): string {
  if (maxSec < 60) return `${minSec}-${maxSec}s`;
  if (minSec % 60 === 0 && maxSec % 60 === 0 && minSec >= 60) {
    return `${minSec / 60}-${maxSec / 60} min`;
  }
  return `${formatDuration(minSec)}-${formatDuration(maxSec)}`;
}

/**
 * Format a stored reps/repsMax pair into a display string: "6-8" or "8".
 * For TIME tracking the pair is seconds and formats as "60s" / "30-60s".
 */
export function formatReps(
  reps: number,
  repsMax?: number | null,
  trackingType: TrackingType = 'REPS'
): string {
  if (trackingType === 'TIME') {
    if (repsMax != null && repsMax > reps) return formatDurationRange(reps, repsMax);
    return formatDuration(reps);
  }
  if (repsMax != null && repsMax > reps) return `${reps}-${repsMax}`;
  return String(reps);
}

/**
 * Format a full prescription for display: "4x 6-8 @ 135" — sets, the rep or
 * duration range, and the prescribed load when there is one. Used anywhere a
 * prescription is shown outside an editor (the chat's flagged-exercise card).
 */
export function formatPrescription(exercise: {
  sets: number;
  reps: number;
  repsMax?: number | null;
  weight?: number | null;
  trackingType?: TrackingType | string;
}): string {
  const tracking: TrackingType =
    exercise.trackingType === 'TIME' ? 'TIME' : 'REPS';
  let text = `${exercise.sets}x ${formatReps(
    exercise.reps,
    exercise.repsMax,
    tracking
  )}`;
  if (exercise.weight != null) text += ` @ ${exercise.weight}`;
  return text;
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

/**
 * Parse one duration term into seconds. Understands "45", "45s", "45 sec",
 * "2m", "2 min", "1:30", and "1m 30s". A bare number uses `fallbackUnit`
 * (seconds unless the other half of a range said otherwise). Null when the
 * term isn't parseable.
 */
function parseDurationTerm(
  term: string,
  fallbackUnit: 'sec' | 'min'
): { seconds: number; explicitUnit: 'sec' | 'min' | null } | null {
  const s = term.trim().toLowerCase();
  if (!s) return null;

  // "1:30" → mm:ss
  const colon = s.match(/^(\d+):(\d{1,2})$/);
  if (colon) {
    return { seconds: Number(colon[1]) * 60 + Number(colon[2]), explicitUnit: 'sec' };
  }

  // "1m 30s" / "1min30s" / "1 min 30 sec"
  const combo = s.match(/^(\d+)\s*m(?:ins?|inutes?)?\s*(\d+)\s*s(?:ecs?|econds?)?$/);
  if (combo) {
    return { seconds: Number(combo[1]) * 60 + Number(combo[2]), explicitUnit: 'sec' };
  }

  // "45", "45s", "45 sec", "2m", "2 min"
  const single = s.match(/^(\d+(?:\.\d+)?)\s*(m(?:ins?|inutes?)?|s(?:ecs?|econds?)?)?$/);
  if (!single) return null;
  const value = parseFloat(single[1]);
  const explicitUnit = single[2] ? (single[2].startsWith('m') ? 'min' : 'sec') : null;
  const unit = explicitUnit ?? fallbackUnit;
  return { seconds: Math.round(unit === 'min' ? value * 60 : value), explicitUnit };
}

/**
 * Parse a coach-entered duration string into a stored pair of seconds.
 * Tolerates "60", "60s", "1:30", "2 min", "1m 30s", and ranges like "30-60s"
 * or "20-30 min" (a unit-less bound inherits the other bound's unit).
 * Returns reps=null when nothing parses, mirroring parseRepsInput.
 */
export function parseDurationInput(input: string | number | null | undefined): {
  reps: number | null;
  repsMax: number | null;
} {
  const raw = String(input ?? '').trim();
  if (!raw) return { reps: null, repsMax: null };

  // Split a range on a dash that sits between two terms ("30-60s", "1:00 - 1:30").
  const parts = raw.split(/[-–—]/).map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return { reps: null, repsMax: null };

  if (parts.length === 1) {
    const term = parseDurationTerm(parts[0], 'sec');
    return { reps: term?.seconds ?? null, repsMax: null };
  }

  // Range: the right bound usually carries the unit ("20-30 min"), so parse it
  // first and let a unit-less left bound inherit.
  const right = parseDurationTerm(parts[1], 'sec');
  if (!right) {
    const left = parseDurationTerm(parts[0], 'sec');
    return { reps: left?.seconds ?? null, repsMax: null };
  }
  const left = parseDurationTerm(parts[0], right.explicitUnit ?? 'sec');
  if (!left) return { reps: right.seconds, repsMax: null };

  const min = Math.min(left.seconds, right.seconds);
  const max = Math.max(left.seconds, right.seconds);
  return { reps: min, repsMax: max > min ? max : null };
}

/**
 * Parse a prescription string using the right grammar for the tracking type.
 * The returned pair is reps for REPS and seconds for TIME.
 */
export function parsePrescriptionInput(
  input: string | number | null | undefined,
  trackingType: TrackingType
): { reps: number | null; repsMax: number | null } {
  return trackingType === 'TIME' ? parseDurationInput(input) : parseRepsInput(input);
}

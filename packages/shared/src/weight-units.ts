/**
 * Weight units. Every weight in the database — prescribed (WorkoutExercise.
 * weight, Exercise.defaultWeight) and logged (SetCompletion.actualWeight) —
 * is stored in pounds. Each person picks kg or lb in Settings
 * (User.weightUnit), and the apps convert at the edges: stored → their unit
 * for display, their unit → stored on input. So a coach who programs in kg
 * and a client who lifts in lb both read the same bar in their own terms.
 *
 * Pounds is the storage unit because every weight saved before units
 * existed was entered against an "lbs" label in the coach's plan editor.
 */

export const WEIGHT_UNITS = ['KG', 'LB'] as const;

export type WeightUnit = (typeof WEIGHT_UNITS)[number];

/** The unit for anyone who hasn't picked one — and the storage unit. */
export const DEFAULT_WEIGHT_UNIT: WeightUnit = 'LB';

const KG_PER_LB = 0.45359237;

/** Short label shown next to a number: "kg" / "lb". */
export function weightUnitLabel(unit: WeightUnit): string {
  return unit === 'KG' ? 'kg' : 'lb';
}

/** Anything off the wire (a missing field, an old payload) → a real unit. */
export function normalizeWeightUnit(value: unknown): WeightUnit {
  return value === 'KG' || value === 'LB' ? value : DEFAULT_WEIGHT_UNIT;
}

/**
 * Round to the nearest half: 44.09 → 44, 35.3 → 35.5. Weights only ever
 * read as whole or .5 numbers — the way plates load — in either unit.
 */
function roundWeight(value: number): number {
  return Math.round(value * 2) / 2;
}

/** A stored weight (lb) in the viewer's unit, rounded for display. */
export function toDisplayWeight(stored: number, unit: WeightUnit): number {
  return roundWeight(unit === 'KG' ? stored * KG_PER_LB : stored);
}

/**
 * A number the viewer typed, in their unit → the stored weight (lb),
 * rounded to the nearest half pound (20 kg → 44 lb, not 44.09). Half a
 * pound is under a quarter kilo, so the kg viewer still reads back 20.
 *
 * `references` are stored weights the input was seeded from (the logged or
 * prescribed value). When the typed number is exactly what one of them
 * displays as, that stored value comes back untouched — a kg lifter who
 * leaves the prescribed 61 kg alone logs the coach's 135 lb, not 134.5,
 * and nobody sees a phantom deviation.
 */
export function fromDisplayWeight(
  value: number,
  unit: WeightUnit,
  references: readonly (number | null | undefined)[] = []
): number {
  for (const ref of references) {
    if (ref != null && toDisplayWeight(ref, unit) === value) return ref;
  }
  return roundWeight(unit === 'KG' ? value / KG_PER_LB : value);
}

/** Display number as text: 61 → "61", 132.5 → "132.5". */
export function formatWeightNumber(stored: number, unit: WeightUnit): string {
  return String(toDisplayWeight(stored, unit));
}

/** Display number with its unit: "61 kg", "135 lb". */
export function formatWeight(stored: number, unit: WeightUnit): string {
  return `${formatWeightNumber(stored, unit)} ${weightUnitLabel(unit)}`;
}

/**
 * A stored weight that may arrive as a number or a numeric string (the
 * coach editor's domain type) → "61 kg". Null when absent or unreadable.
 */
export function formatStoredWeight(
  stored: string | number | null | undefined,
  unit: WeightUnit
): string | null {
  if (stored == null || stored === '') return null;
  const n = Number(stored);
  return Number.isNaN(n) ? null : formatWeight(n, unit);
}

/** Settings copy for the kg/lb switch — one wording for both apps. */
export const WEIGHT_UNIT_SETTING = {
  label: 'Weight unit',
  hint: {
    coach:
      'Plans you write and your clients’ logged sets read in this unit. Clients pick their own, and weights convert between you.',
    client:
      'Your plan, logged sets and history read in this unit. Your coach picks their own, and weights convert between you.',
  },
  saved: (unit: WeightUnit) => `Weights now in ${weightUnitLabel(unit)}`,
} as const;

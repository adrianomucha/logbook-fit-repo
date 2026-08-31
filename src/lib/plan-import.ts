/**
 * Excel plan import — the pure half. Turns raw spreadsheet rows (one row per
 * prescribed exercise) into the Plan → Week → Day → WorkoutExercise tree the
 * API persists, collecting per-row errors a coach can act on ("Row 7: Sets
 * must be between 1 and 20") instead of a single opaque failure.
 *
 * Everything Excel-specific (reading workbooks, generating the template) lives
 * in plan-import-xlsx.ts so this module stays dependency-free and testable.
 */

import { parseDurationInput, parseRepsInput, TrackingType } from "./reps";

// ──────────────────────────────────────
// Template shape (shared by generator and parser)
// ──────────────────────────────────────

/**
 * The template's column order. Parsing matches on header TEXT (normalized),
 * not position, so a coach who reorders or deletes optional columns is fine.
 */
export const IMPORT_COLUMNS = [
  { key: "week", header: "Week", required: true },
  { key: "day", header: "Day", required: true },
  { key: "dayName", header: "Day Name", required: false },
  { key: "exercise", header: "Exercise", required: true },
  { key: "sets", header: "Sets", required: true },
  { key: "reps", header: "Reps / Time", required: true },
  { key: "weight", header: "Weight", required: false },
  { key: "rest", header: "Rest (sec)", required: false },
  { key: "notes", header: "Notes", required: false },
  { key: "superset", header: "Superset", required: false },
] as const;

export type ImportColumnKey = (typeof IMPORT_COLUMNS)[number]["key"];

/** Header cell → column key, tolerant of case, punctuation, and synonyms. */
export function matchHeader(text: string): ImportColumnKey | null {
  const normalized = text.toLowerCase().replace(/[^a-z]/g, "");
  const aliases: Record<string, ImportColumnKey> = {
    week: "week",
    weekno: "week",
    weeknumber: "week",
    day: "day",
    dayno: "day",
    daynumber: "day",
    workout: "day",
    dayname: "dayName",
    workoutname: "dayName",
    exercise: "exercise",
    exercisename: "exercise",
    movement: "exercise",
    sets: "sets",
    reps: "reps",
    repstime: "reps",
    repsortime: "reps",
    time: "reps",
    repsseconds: "reps",
    weight: "weight",
    weightkg: "weight",
    weightlbs: "weight",
    load: "weight",
    rest: "rest",
    restsec: "rest",
    restseconds: "rest",
    notes: "notes",
    note: "notes",
    coachnotes: "notes",
    superset: "superset",
    supersetwithprevious: "superset",
  };
  return aliases[normalized] ?? null;
}

// ──────────────────────────────────────
// Row parsing
// ──────────────────────────────────────

/** One spreadsheet row, cells already reduced to plain strings (or null). */
export type RawImportRow = {
  /** 1-based Excel row number, for error messages that match what the coach sees. */
  rowNumber: number;
} & Partial<Record<ImportColumnKey, string | null>>;

export type ImportRowError = { row: number; message: string };

export type ParsedImportExercise = {
  name: string;
  trackingType: TrackingType;
  sets: number;
  reps: number;
  repsMax: number | null;
  weight: number | null;
  restSeconds: number | null;
  coachNotes: string | null;
  supersetWithPrevious: boolean;
};

export type ParsedImportDay = {
  orderIndex: number;
  name: string | null;
  exercises: ParsedImportExercise[];
};

export type ParsedImportWeek = {
  weekNumber: number;
  days: ParsedImportDay[];
};

export type ParsedImportPlan = {
  durationWeeks: number;
  workoutsPerWeek: number;
  weeks: ParsedImportWeek[];
};

// Bounds mirror the Zod schemas the manual editor goes through
// (addWorkoutExerciseSchema / createPlanSchema) — an imported plan must never
// contain values the editing UI would reject.
export const IMPORT_LIMITS = {
  maxWeeks: 12,
  maxDaysPerWeek: 7,
  maxExercisesPerDay: 20,
  maxRows: 2000,
  maxSets: 20,
  maxReps: 3600,
  maxWeight: 1000,
  maxRestSeconds: 600,
  maxNotesLength: 1000,
  maxExerciseNameLength: 100,
  maxDayNameLength: 100,
} as const;

const blank = (value: string | null | undefined): boolean =>
  value == null || value.trim() === "";

/** First integer in the cell — tolerates "1", "Week 1", "1.0". */
function parseIndex(value: string): number | null {
  const match = value.match(/\d+/);
  if (!match) return null;
  const n = Number(match[0]);
  return Number.isInteger(n) ? n : null;
}

function parseNumber(value: string): number | null {
  // Tolerate a decimal comma and trailing units ("60 kg", "132.5lbs")
  const match = value.replace(",", ".").match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const n = Number(match[0]);
  return Number.isFinite(n) ? n : null;
}

/**
 * A prescription cell counts as a duration when it carries a time marker —
 * "45s", "2 min", "1:30". Bare numbers and ranges ("8", "6-8", even "8 reps")
 * stay reps.
 */
export function looksLikeDuration(value: string): boolean {
  return (
    /\d\s*:\s*\d/.test(value) ||
    /\d\s*(s|secs?|seconds?|m|mins?|minutes?)\b/i.test(value)
  );
}

const SUPERSET_TOKENS = new Set(["y", "yes", "x", "true", "1", "✓", "✔"]);

/**
 * Parse validated spreadsheet rows into a plan tree. Never throws — anything
 * wrong with a row lands in `errors` with its Excel row number. The tree is a
 * uniform grid (every week gets the same day slots, like the manual plan
 * scaffold), so days a coach left empty still show up in the editor.
 */
export function parseImportRows(rows: RawImportRow[]): {
  plan: ParsedImportPlan | null;
  errors: ImportRowError[];
} {
  const errors: ImportRowError[] = [];

  const contentRows = rows.filter(
    (r) =>
      !blank(r.week) ||
      !blank(r.day) ||
      !blank(r.exercise) ||
      !blank(r.dayName)
  );

  if (contentRows.length === 0) {
    return {
      plan: null,
      errors: [{ row: 0, message: "The file has no workout rows. Fill in the Workouts sheet and upload it again." }],
    };
  }
  if (contentRows.length > IMPORT_LIMITS.maxRows) {
    return {
      plan: null,
      errors: [{ row: 0, message: `Too many rows — the limit is ${IMPORT_LIMITS.maxRows} exercises per plan.` }],
    };
  }

  // (week → day → exercises), preserving file order within each day
  const grid = new Map<number, Map<number, { name: string | null; exercises: ParsedImportExercise[] }>>();

  for (const row of contentRows) {
    const fail = (message: string) => errors.push({ row: row.rowNumber, message });

    const week = blank(row.week) ? null : parseIndex(row.week!);
    if (week == null || week < 1 || week > IMPORT_LIMITS.maxWeeks) {
      fail(`Week must be a number between 1 and ${IMPORT_LIMITS.maxWeeks}.`);
      continue;
    }

    const day = blank(row.day) ? null : parseIndex(row.day!);
    if (day == null || day < 1 || day > IMPORT_LIMITS.maxDaysPerWeek) {
      fail(`Day must be a number between 1 and ${IMPORT_LIMITS.maxDaysPerWeek}.`);
      continue;
    }

    if (!grid.has(week)) grid.set(week, new Map());
    const weekDays = grid.get(week)!;
    if (!weekDays.has(day)) weekDays.set(day, { name: null, exercises: [] });
    const dayEntry = weekDays.get(day)!;

    // First non-empty Day Name for a slot wins; later disagreements are ignored
    if (!blank(row.dayName) && dayEntry.name == null) {
      dayEntry.name = row.dayName!.trim().slice(0, IMPORT_LIMITS.maxDayNameLength);
    }

    // A row can name a day without prescribing an exercise
    if (blank(row.exercise)) continue;

    const name = row.exercise!.trim();
    if (name.length > IMPORT_LIMITS.maxExerciseNameLength) {
      fail(`Exercise name is too long (max ${IMPORT_LIMITS.maxExerciseNameLength} characters).`);
      continue;
    }

    const sets = blank(row.sets) ? null : parseIndex(row.sets!);
    if (sets == null || sets < 1 || sets > IMPORT_LIMITS.maxSets) {
      fail(`Sets must be a number between 1 and ${IMPORT_LIMITS.maxSets}.`);
      continue;
    }

    if (blank(row.reps)) {
      fail('Reps / Time is required — e.g. "8", "6-8", "45s", or "2 min".');
      continue;
    }
    const repsText = row.reps!.trim();
    const trackingType: TrackingType = looksLikeDuration(repsText) ? "TIME" : "REPS";
    const { reps, repsMax } =
      trackingType === "TIME" ? parseDurationInput(repsText) : parseRepsInput(repsText);
    if (reps == null || reps < 1 || reps > IMPORT_LIMITS.maxReps || (repsMax != null && repsMax > IMPORT_LIMITS.maxReps)) {
      fail(
        trackingType === "TIME"
          ? 'Couldn’t read the time — use formats like "45s", "1:30", or "20-30 min" (max 1 hour).'
          : 'Couldn’t read the reps — use formats like "8" or "6-8" (max 3600).'
      );
      continue;
    }

    let weight: number | null = null;
    if (!blank(row.weight)) {
      weight = parseNumber(row.weight!);
      if (weight == null || weight < 0 || weight > IMPORT_LIMITS.maxWeight) {
        fail(`Weight must be a number between 0 and ${IMPORT_LIMITS.maxWeight}.`);
        continue;
      }
    }

    let restSeconds: number | null = null;
    if (!blank(row.rest)) {
      restSeconds = parseIndex(row.rest!);
      if (restSeconds == null || restSeconds < 0 || restSeconds > IMPORT_LIMITS.maxRestSeconds) {
        fail(`Rest must be a number of seconds between 0 and ${IMPORT_LIMITS.maxRestSeconds}.`);
        continue;
      }
    }

    let coachNotes: string | null = null;
    if (!blank(row.notes)) {
      coachNotes = row.notes!.trim();
      if (coachNotes.length > IMPORT_LIMITS.maxNotesLength) {
        fail(`Notes are too long (max ${IMPORT_LIMITS.maxNotesLength} characters).`);
        continue;
      }
    }

    const supersetWithPrevious =
      !blank(row.superset) &&
      SUPERSET_TOKENS.has(row.superset!.trim().toLowerCase()) &&
      // "Superset with previous" is meaningless on the day's first exercise
      dayEntry.exercises.length > 0;

    if (dayEntry.exercises.length >= IMPORT_LIMITS.maxExercisesPerDay) {
      fail(`Week ${week} Day ${day} has too many exercises (max ${IMPORT_LIMITS.maxExercisesPerDay}).`);
      continue;
    }

    dayEntry.exercises.push({
      name,
      trackingType,
      sets,
      reps,
      repsMax,
      weight,
      restSeconds,
      coachNotes,
      supersetWithPrevious,
    });
  }

  if (errors.length > 0) return { plan: null, errors };

  const durationWeeks = Math.max(...grid.keys());
  const workoutsPerWeek = Math.max(
    ...[...grid.values()].flatMap((days) => [...days.keys()])
  );

  // Uniform grid: weeks 1..durationWeeks each get days 1..workoutsPerWeek,
  // matching what POST /api/plans scaffolds — slots without rows stay empty.
  const weeks: ParsedImportWeek[] = [];
  for (let w = 1; w <= durationWeeks; w++) {
    const weekDays = grid.get(w);
    const days: ParsedImportDay[] = [];
    for (let d = 1; d <= workoutsPerWeek; d++) {
      const entry = weekDays?.get(d);
      days.push({
        orderIndex: d,
        name: entry?.name ?? `Day ${d}`,
        exercises: entry?.exercises ?? [],
      });
    }
    weeks.push({ weekNumber: w, days });
  }

  return { plan: { durationWeeks, workoutsPerWeek, weeks }, errors: [] };
}

/** Unique exercise names across the plan (first-seen casing and tracking type). */
export function collectImportExercises(
  plan: ParsedImportPlan
): { name: string; trackingType: TrackingType }[] {
  const byKey = new Map<string, { name: string; trackingType: TrackingType }>();
  for (const week of plan.weeks) {
    for (const day of week.days) {
      for (const exercise of day.exercises) {
        const key = exercise.name.toLowerCase();
        if (!byKey.has(key)) {
          byKey.set(key, { name: exercise.name, trackingType: exercise.trackingType });
        }
      }
    }
  }
  return [...byKey.values()];
}

/**
 * Excel plan import: the pure half. Turns raw spreadsheet rows (one row per
 * prescribed exercise) into the Plan → Week → Day → WorkoutExercise tree the
 * API persists, collecting per-row errors a coach can act on ("Row 7: Sets
 * must be between 1 and 20") instead of a single opaque failure.
 *
 * Everything Excel-specific (reading workbooks, generating the template) lives
 * in plan-import-xlsx.ts so this module stays dependency-free and testable.
 */

import { parseDurationInput, parseRepsInput, TrackingType } from "./reps";
import {
  DEFAULT_WEIGHT_UNIT,
  fromDisplayWeight,
  type WeightUnit,
} from "@logbook/shared/weight-units";

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
  /**
   * The coach's sheet the row came from, when it isn't the template's single
   * Workouts sheet (rows read from a free-form workbook); errors name it.
   */
  sheet?: string;
} & Partial<Record<ImportColumnKey, string | null>>;

export type ImportRowError = {
  row: number;
  sheet?: string;
  message: string;
  /** The prescription field that couldn't be read, when it's one a coach can pick on review */
  field?: ImportChoiceField;
};

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
// (addWorkoutExerciseSchema / createPlanSchema): an imported plan must never
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

/** First integer in the cell; tolerates "1", "Week 1", "1.0". */
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

/** A unit written into a weight cell ("60 kg", "135lbs"), if any. */
function weightCellUnit(value: string): WeightUnit | null {
  if (/kg|kilo/i.test(value)) return "KG";
  if (/lb|pound/i.test(value)) return "LB";
  return null;
}

/**
 * A prescription cell counts as a duration when it carries a time marker:
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
 * Parse validated spreadsheet rows into a plan tree. Never throws; anything
 * wrong with a row lands in `errors` with its Excel row number. The tree is a
 * uniform grid (every week gets the same day slots, like the manual plan
 * scaffold), so days a coach left empty still show up in the editor.
 */
export function parseImportRows(
  rows: RawImportRow[],
  /** The importing coach's unit, read for weight cells that don't name one */
  weightUnit: WeightUnit = DEFAULT_WEIGHT_UNIT
): {
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
      errors: [{ row: 0, message: `Too many rows. The limit is ${IMPORT_LIMITS.maxRows} exercises per plan.` }],
    };
  }

  // (week → day → exercises), preserving file order within each day
  const grid = new Map<number, Map<number, { name: string | null; exercises: ParsedImportExercise[] }>>();

  for (const row of contentRows) {
    const fail = (message: string, field?: ImportChoiceField) =>
      errors.push({
        row: row.rowNumber,
        ...(row.sheet ? { sheet: row.sheet } : {}),
        message,
        ...(field ? { field } : {}),
      });

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
      fail(`Sets must be a number between 1 and ${IMPORT_LIMITS.maxSets}.`, "sets");
      continue;
    }

    if (blank(row.reps)) {
      fail('Reps / Time is required, e.g. "8", "6-8", "45s", or "2 min".', "reps");
      continue;
    }
    const repsText = row.reps!.trim();
    const trackingType: TrackingType = looksLikeDuration(repsText) ? "TIME" : "REPS";
    const { reps, repsMax } =
      trackingType === "TIME" ? parseDurationInput(repsText) : parseRepsInput(repsText);
    if (reps == null || reps < 1 || reps > IMPORT_LIMITS.maxReps || (repsMax != null && repsMax > IMPORT_LIMITS.maxReps)) {
      fail(
        trackingType === "TIME"
          ? 'Couldn’t read the time. Use formats like "45s", "1:30", or "20-30 min" (max 1 hour).'
          : 'Couldn’t read the reps. Use formats like "8" or "6-8" (max 3600).',
        "reps"
      );
      continue;
    }

    // Read in the cell's own unit, else the coach's; stored as lb
    let weight: number | null = null;
    if (!blank(row.weight)) {
      const entered = parseNumber(row.weight!);
      if (entered == null || entered < 0 || entered > IMPORT_LIMITS.maxWeight) {
        fail(`Weight must be a number between 0 and ${IMPORT_LIMITS.maxWeight}.`, "weight");
        continue;
      }
      weight = fromDisplayWeight(entered, weightCellUnit(row.weight!) ?? weightUnit);
    }

    let restSeconds: number | null = null;
    if (!blank(row.rest)) {
      restSeconds = parseIndex(row.rest!);
      if (restSeconds == null || restSeconds < 0 || restSeconds > IMPORT_LIMITS.maxRestSeconds) {
        fail(`Rest must be a number of seconds between 0 and ${IMPORT_LIMITS.maxRestSeconds}.`, "rest");
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
  // matching what POST /api/plans scaffolds; slots without rows stay empty.
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

/**
 * The 400 body for a failed parse: one headline plus the per-row list the
 * import dialog shows ({ row, sheet?, message }).
 */
export function importErrorBody(errors: ImportRowError[]): {
  error: string;
  rowErrors: ImportRowError[];
} {
  return {
    error:
      errors.length === 1 && errors[0].row === 0
        ? errors[0].message
        : `The file has ${errors.length} ${errors.length === 1 ? "problem" : "problems"}. Fix the rows below and upload it again`,
    rowErrors: errors.filter((e) => e.row > 0),
  };
}

/** The prescription fields a coach can settle on the review step. */
export const IMPORT_CHOICE_FIELDS = ["sets", "reps", "weight", "rest"] as const;
export type ImportChoiceField = (typeof IMPORT_CHOICE_FIELDS)[number];

/**
 * A value the coach settles on the review step instead of hunting for it in
 * the editor later. Either the AI reader had to guess (the sheet said "2-3
 * min" rest), and `current` is its guess among the options; or it couldn't
 * fill the value in at all (AMRAP with no target), and the coach must pick
 * or type one before the plan can be created.
 */
export type ImportChoice = {
  /** The exercise, spelled as in the plan's rows */
  exercise: string;
  field: ImportChoiceField;
  /** What the sheet actually said, e.g. "2-3 min rest"; "" when it says nothing */
  said: string;
  /** The value in the rows now, which a pick replaces */
  current: string;
  /** Values to offer, in the row's own format (rest in seconds) */
  options: string[];
};

const sameValue = (a: string | null | undefined, b: string | null | undefined) =>
  (a ?? "").replace(/\s+/g, "").toLowerCase() === (b ?? "").replace(/\s+/g, "").toLowerCase();

/** The reader's guess when it's one of the options, else nothing: the coach must choose. */
export function defaultImportPick(choice: ImportChoice): string | undefined {
  return choice.options.find((option) => sameValue(option, choice.current));
}

/**
 * Stand-ins for values a coach hasn't supplied yet, so the review can still
 * lay the plan out (it shows "?" in their place). Never sent to be saved:
 * Create stays disabled until every required choice has a value.
 */
export const IMPORT_CHOICE_PLACEHOLDER: Record<ImportChoiceField, string> = {
  sets: "1",
  reps: "1",
  weight: "",
  rest: "",
};

/**
 * Rows with the coach's picks applied. Each choice replaces its `current`
 * value in that exercise's rows and leaves any other value alone, so a
 * week-by-week progression on the same exercise survives. Always applied
 * to the rows as read, so changing a pick is idempotent.
 */
export function applyImportChoices(
  rows: RawImportRow[],
  choices: ImportChoice[],
  picks: (string | undefined)[]
): RawImportRow[] {
  return rows.map((row) => {
    let next = row;
    choices.forEach((choice, i) => {
      const pick = picks[i];
      if (pick == null || sameValue(pick, choice.current)) return;
      if (row.exercise?.trim().toLowerCase() !== choice.exercise.toLowerCase()) return;
      if (!sameValue(row[choice.field], choice.current)) return;
      next = { ...next, [choice.field]: pick };
    });
    return next;
  });
}

const isChoiceField = (field: string | undefined): field is ImportChoiceField =>
  (IMPORT_CHOICE_FIELDS as readonly string[]).includes(field ?? "");

/**
 * Turn every sets/reps/weight/rest value the AI reader couldn't fill in
 * into a choice for the coach, instead of failing the whole file over it.
 * `suggestions` are the reader's own choices; one for the same exercise and
 * field lends its wording and options (the ones that would parse). Returns
 * the choices to show, plus the errors nothing on the review step can fix
 * (a bad week number, say), which still fail the upload.
 */
export function settleAiRows(
  rows: RawImportRow[],
  suggestions: Omit<ImportChoice, "current">[],
  weightUnit: WeightUnit = DEFAULT_WEIGHT_UNIT
): { choices: ImportChoice[]; errors: ImportRowError[] } {
  const required: ImportChoice[] = [];
  const findRequired = (exercise: string, field: ImportChoiceField, current: string) =>
    required.find(
      (c) => c.exercise.toLowerCase() === exercise.toLowerCase() && c.field === field && sameValue(c.current, current)
    );

  for (const row of rows) {
    if (!row.exercise?.trim()) continue;
    let probe = row;
    // A row can have more than one unreadable value; parse stops at the first
    for (let attempt = 0; attempt < IMPORT_CHOICE_FIELDS.length; attempt++) {
      const error = parseImportRows([probe], weightUnit).errors[0];
      if (!error || !isChoiceField(error.field)) break;
      const field = error.field;
      const current = (row[field] ?? "").trim();
      if (!findRequired(row.exercise, field, current)) {
        const suggestion = suggestions.find(
          (c) => c.exercise.trim().toLowerCase() === row.exercise!.trim().toLowerCase() && c.field === field
        );
        const options = (suggestion?.options ?? []).filter(
          (option) => !parseImportRows([{ ...probe, [field]: option }], weightUnit).errors.some((e) => e.field === field)
        );
        required.push({
          exercise: row.exercise.trim(),
          field,
          said: suggestion?.said ?? current,
          current,
          options,
        });
      }
      probe = { ...probe, [field]: IMPORT_CHOICE_PLACEHOLDER[field] };
    }
  }

  const choices = [...required];
  const placeholders = choices.map((c) => IMPORT_CHOICE_PLACEHOLDER[c.field]);
  const { errors } = parseImportRows(applyImportChoices(rows, choices, placeholders), weightUnit);
  return { choices, errors };
}

/** What POST /api/plans/import/preview returns for the coach to review. */
export type PlanImportPreview = {
  /** "template" when the sheet matched our columns, "ai" when a model read it */
  source: "template" | "ai";
  /** Sent back unchanged to POST /api/plans/import to create the plan */
  rows: RawImportRow[];
  plan: ParsedImportPlan;
  /** Exercise names not yet in the coach's library, created on import */
  newExercises: string[];
  /** Ambiguous values for the coach to settle before creating the plan */
  choices: ImportChoice[];
  /** Anything else the AI reader skipped or couldn't place, in plain sentences */
  notes: string[];
  /** The coach's unit, for showing the stored-lb weights */
  weightUnit: WeightUnit;
};

/**
 * Excel plan import — the workbook half (server-only, pulls in exceljs).
 * Generates the downloadable template a coach fills in, and reads an uploaded
 * workbook back into the plain rows plan-import.ts knows how to parse.
 */

import ExcelJS from "exceljs";
import {
  IMPORT_COLUMNS,
  IMPORT_LIMITS,
  matchHeader,
  type ImportColumnKey,
  type RawImportRow,
} from "./plan-import";

export const TEMPLATE_FILENAME = "workout-plan-template.xlsx";
export const WORKOUTS_SHEET = "Workouts";

/** Rows covered by dropdowns/validation in the template — not a parse limit. */
const VALIDATED_ROWS = 500;

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF111827" }, // matches the app's near-black foreground
};

// Example rows the coach overwrites — one filled week showing every feature:
// rep ranges, a time-based exercise, a superset pair, notes.
const EXAMPLE_ROWS: (string | number)[][] = [
  [1, 1, "Upper Body", "Barbell Bench Press", 4, "6-8", 60, 120, "Pause on the chest", ""],
  [1, 1, "", "Barbell Rows", 4, "8-10", 50, 90, "", ""],
  [1, 1, "", "Overhead Press", 3, "8-10", 30, 90, "", ""],
  [1, 1, "", "Lateral Raises", 3, "12-15", 8, 60, "Superset with the press", "Y"],
  [1, 1, "", "Plank", 3, "45s", "", 60, "Brace hard", ""],
  [1, 2, "Lower Body", "Barbell Squat", 4, "6-8", 80, 150, "3s descent", ""],
  [1, 2, "", "Romanian Deadlift", 3, "8-10", 60, 120, "", ""],
  [1, 2, "", "Walking Lunges", 3, "12", 20, 90, "Per leg", ""],
  [1, 2, "", "Calf Raises", 3, "15-20", 40, 60, "", ""],
];

const INSTRUCTIONS: string[] = [
  "How to fill in this template",
  "",
  "Each row on the Workouts sheet is one exercise in one workout.",
  "The example rows show one filled week — replace them with your own plan.",
  "",
  `Week — which week of the plan (1-${IMPORT_LIMITS.maxWeeks}).`,
  `Day — which workout of that week (1-${IMPORT_LIMITS.maxDaysPerWeek}). Rest days are simply not listed.`,
  'Day Name — optional workout title like "Upper Body Push". Only needed on the day’s first row.',
  "Exercise — the exercise name. New names are added to your exercise library automatically.",
  `Sets — number of sets (1-${IMPORT_LIMITS.maxSets}).`,
  'Reps / Time — a count like "8", a range like "6-8", or a duration like "45s", "1:30", "20-30 min".',
  "Weight — optional prescribed load, in the units you use with your clients.",
  `Rest (sec) — optional rest between sets, in seconds (0-${IMPORT_LIMITS.maxRestSeconds}).`,
  "Notes — optional coaching cues shown to the client with the exercise.",
  'Superset — put "Y" to chain an exercise to the row above it as a superset.',
  "",
  "When you're done, upload the file back on the Plans page (Import from Excel).",
];

/** Build the template workbook a coach downloads, as an .xlsx buffer. */
export async function buildPlanTemplateWorkbook(): Promise<ExcelJS.Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Logbook";

  const sheet = workbook.addWorksheet(WORKOUTS_SHEET, {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  sheet.columns = [
    { header: IMPORT_COLUMNS[0].header, key: "week", width: 8 },
    { header: IMPORT_COLUMNS[1].header, key: "day", width: 8 },
    { header: IMPORT_COLUMNS[2].header, key: "dayName", width: 18 },
    { header: IMPORT_COLUMNS[3].header, key: "exercise", width: 28 },
    { header: IMPORT_COLUMNS[4].header, key: "sets", width: 8 },
    { header: IMPORT_COLUMNS[5].header, key: "reps", width: 12 },
    { header: IMPORT_COLUMNS[6].header, key: "weight", width: 10 },
    { header: IMPORT_COLUMNS[7].header, key: "rest", width: 11 },
    { header: IMPORT_COLUMNS[8].header, key: "notes", width: 32 },
    { header: IMPORT_COLUMNS[9].header, key: "superset", width: 10 },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = HEADER_FILL;
  headerRow.height = 20;

  for (const row of EXAMPLE_ROWS) sheet.addRow(row);

  // Guide-rail dropdowns/bounds for the rows a coach will actually type in.
  // showErrorMessage keeps typos from ever reaching the upload step.
  const whole = (min: number, max: number, title: string): ExcelJS.DataValidation => ({
    type: "whole",
    operator: "between",
    formulae: [min, max],
    allowBlank: true,
    showErrorMessage: true,
    errorTitle: title,
    error: `Enter a whole number between ${min} and ${max}.`,
  });
  for (let r = 2; r <= VALIDATED_ROWS; r++) {
    sheet.getCell(`A${r}`).dataValidation = whole(1, IMPORT_LIMITS.maxWeeks, "Week");
    sheet.getCell(`B${r}`).dataValidation = whole(1, IMPORT_LIMITS.maxDaysPerWeek, "Day");
    sheet.getCell(`E${r}`).dataValidation = whole(1, IMPORT_LIMITS.maxSets, "Sets");
    sheet.getCell(`H${r}`).dataValidation = whole(0, IMPORT_LIMITS.maxRestSeconds, "Rest");
    sheet.getCell(`J${r}`).dataValidation = {
      type: "list",
      formulae: ['"Y"'],
      allowBlank: true,
      showErrorMessage: true,
      errorTitle: "Superset",
      error: 'Put "Y" to superset with the exercise above, or leave blank.',
    };
  }

  const instructions = workbook.addWorksheet("Instructions");
  instructions.getColumn(1).width = 110;
  for (const line of INSTRUCTIONS) instructions.addRow([line]);
  instructions.getRow(1).font = { bold: true, size: 14 };

  return workbook.xlsx.writeBuffer();
}

// ──────────────────────────────────────
// Reading an uploaded workbook
// ──────────────────────────────────────

/** Reduce any exceljs cell value to the plain string plan-import.ts expects. */
function cellToString(cell: ExcelJS.Cell): string | null {
  const value = cell.value;
  if (value == null) return null;
  if (typeof value === "object") {
    if (value instanceof Date) return String(value.getTime());
    if ("richText" in value) return value.richText.map((t) => t.text).join("");
    if ("text" in value) return value.text == null ? null : String(value.text);
    if ("result" in value) return value.result == null ? null : String(value.result);
    if ("error" in value) return null;
    return null;
  }
  return String(value);
}

export type ReadWorkoutRowsResult =
  | { ok: true; rows: RawImportRow[] }
  | { ok: false; error: string };

/**
 * Load an uploaded .xlsx and return its workout rows. Header matching is by
 * text, so reordered columns work; the sheet is found by name with a fallback
 * to the first sheet that carries the expected headers.
 */
export async function readWorkoutRows(buffer: Buffer): Promise<ReadWorkoutRowsResult> {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  } catch {
    return { ok: false, error: "Couldn’t read that file. Upload the .xlsx template with your workouts filled in." };
  }

  const named = workbook.worksheets.find(
    (ws) => ws.name.trim().toLowerCase() === WORKOUTS_SHEET.toLowerCase()
  );
  const candidates = named ? [named] : workbook.worksheets;

  for (const sheet of candidates) {
    // The header row is normally row 1, but tolerate a title row or two above
    for (let headerRowNumber = 1; headerRowNumber <= 5; headerRowNumber++) {
      const columnByKey = new Map<ImportColumnKey, number>();
      const headerRow = sheet.getRow(headerRowNumber);
      headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        const text = cellToString(cell);
        const key = text ? matchHeader(text) : null;
        if (key && !columnByKey.has(key)) columnByKey.set(key, colNumber);
      });

      const requiredKeys = IMPORT_COLUMNS.filter((c) => c.required).map((c) => c.key);
      if (!requiredKeys.every((key) => columnByKey.has(key))) continue;

      const rows: RawImportRow[] = [];
      sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber <= headerRowNumber) return;
        const raw: RawImportRow = { rowNumber };
        for (const [key, colNumber] of columnByKey) {
          raw[key] = cellToString(row.getCell(colNumber));
        }
        rows.push(raw);
      });
      return { ok: true, rows };
    }
  }

  return {
    ok: false,
    error:
      "Couldn’t find the workout columns (Week, Day, Exercise, Sets, Reps / Time). Start from the downloaded template so the headers match.",
  };
}

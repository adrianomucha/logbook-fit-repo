/**
 * Excel plan import — the workbook half (server-only, pulls in exceljs).
 * Generates the downloadable template a coach fills in, reads an uploaded
 * template back into the plain rows plan-import.ts knows how to parse, and
 * renders any other workbook as text for the AI reader (plan-import-ai.ts).
 */

import { Readable } from "stream";
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
  'Weight — optional prescribed load, in the unit set in your Settings (kg or lb). Write "60 kg" or "135 lb" to use the other one.',
  `Rest (sec) — optional rest between sets, in seconds (0-${IMPORT_LIMITS.maxRestSeconds}).`,
  "Notes — optional coaching cues shown to the client with the exercise.",
  'Superset — put "Y" to chain an exercise to the row above it as a superset.',
  "",
  "When you're done, upload the file back on the Plans page (Import from Excel).",
  "Already have your own spreadsheet? Upload it as it is — Logbook reads other layouts too, and shows you the plan to check before it’s created.",
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

export type LoadWorkbookResult =
  | { ok: true; workbook: ExcelJS.Workbook }
  | { ok: false; error: string };

/** .xlsx files are zip archives; legacy .xls files are OLE compound documents. */
const XLSX_MAGIC = [0x50, 0x4b, 0x03, 0x04];
const XLS_MAGIC = [0xd0, 0xcf, 0x11, 0xe0];
const startsWith = (buffer: Buffer, magic: number[]) =>
  magic.every((byte, i) => buffer[i] === byte);

/**
 * Open an uploaded spreadsheet: .xlsx by its zip signature, anything else
 * named .csv as CSV. CSV cells stay the exact text the coach typed — exceljs
 * would otherwise turn "6-8" into a date.
 */
export async function loadWorkbook(buffer: Buffer, filename: string): Promise<LoadWorkbookResult> {
  const workbook = new ExcelJS.Workbook();

  if (startsWith(buffer, XLS_MAGIC)) {
    return { ok: false, error: "That’s an old .xls file. Open it in Excel, save it as .xlsx, and upload it again." };
  }

  try {
    if (startsWith(buffer, XLSX_MAGIC)) {
      await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
      return { ok: true, workbook };
    }
    if (/\.csv$/i.test(filename)) {
      await workbook.csv.read(Readable.from(buffer), { map: (value: string) => value });
      return { ok: true, workbook };
    }
  } catch {
    // Fall through to the generic message
  }
  return { ok: false, error: "Couldn’t read that file. Upload an Excel (.xlsx) or CSV file." };
}

/**
 * The workout rows of a workbook laid out like the template, or null when
 * no sheet carries the template's headers. Header matching is by text, so
 * reordered columns work; the sheet is found by name with a fallback to the
 * first sheet that carries the expected headers.
 */
export function findTemplateRows(workbook: ExcelJS.Workbook): RawImportRow[] | null {
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
      return rows;
    }
  }

  return null;
}

export const TEMPLATE_HEADERS_MISSING_ERROR =
  "Couldn’t find the workout columns (Week, Day, Exercise, Sets, Reps / Time). Start from the downloaded template so the headers match.";

// ──────────────────────────────────────
// Free-form workbooks → text for the AI reader
// ──────────────────────────────────────

/**
 * Caps the text sent to the model. ~200k characters is roughly 50k tokens —
 * far beyond any real plan, and under the 100k-token prompt size where the
 * model's price per token goes up.
 */
export const MAX_WORKBOOK_TEXT_CHARS = 200_000;
const MAX_CELL_CHARS = 500;

/** What the coach sees in a cell, as close as the stored value allows. */
function cellDisplayText(cell: ExcelJS.Cell): string | null {
  const value = cell.value;
  if (value instanceof Date) {
    // Excel silently turns rep ranges like "6-8" into dates; show the date
    // plainly so the reader can recognise one.
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "number" && typeof cell.numFmt === "string" && cell.numFmt.includes("%")) {
    return `${Number((value * 100).toFixed(4))}%`;
  }
  const result = typeof value === "object" && value !== null && "result" in value ? value.result : undefined;
  if (result instanceof Date) return result.toISOString().slice(0, 10);
  return cellToString(cell);
}

export type WorkbookTextResult =
  | { ok: true; text: string }
  | { ok: false; error: string };

/**
 * Every visible, non-empty cell of the workbook as plain text, one line per
 * row with cell addresses — enough for a model to see the layout (which
 * columns are weeks, which rows are days) and to cite the coach's own rows.
 *
 *   Sheet "Week 1"
 *   Row 1: A1 (merged A1:D1) "Upper Body"
 *   Row 2: A2 "Bench Press" | B2 "3x8" | C2 "60kg"
 */
export function workbookToText(workbook: ExcelJS.Workbook): WorkbookTextResult {
  const lines: string[] = [];
  let length = 0;

  for (const sheet of workbook.worksheets) {
    if (sheet.state !== "visible") continue;

    const mergeRanges = new Map<string, string>();
    for (const range of (sheet.model as { merges?: string[] }).merges ?? []) {
      mergeRanges.set(range.split(":")[0], range);
    }

    const sheetLines: string[] = [];
    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      const cells: string[] = [];
      row.eachCell({ includeEmpty: false }, (cell) => {
        // Merged cells repeat the top-left value; list it once, with its span
        if (cell.isMerged && cell.master.address !== cell.address) return;
        const text = cellDisplayText(cell)?.trim();
        if (!text) return;
        const range = mergeRanges.get(cell.address);
        const label = range ? `${cell.address} (merged ${range})` : cell.address;
        cells.push(`${label} ${JSON.stringify(text.slice(0, MAX_CELL_CHARS))}`);
      });
      if (cells.length > 0) sheetLines.push(`Row ${rowNumber}: ${cells.join(" | ")}`);
    });
    if (sheetLines.length === 0) continue;

    for (const line of [`Sheet ${JSON.stringify(sheet.name)}`, ...sheetLines, ""]) {
      length += line.length + 1;
      if (length > MAX_WORKBOOK_TEXT_CHARS) {
        return {
          ok: false,
          error: "This spreadsheet is too big to read automatically. Delete the sheets that aren’t part of the plan and upload it again.",
        };
      }
      lines.push(line);
    }
  }

  if (lines.length === 0) {
    return { ok: false, error: "The file is empty. Add your workouts and upload it again." };
  }
  return { ok: true, text: lines.join("\n").trimEnd() };
}

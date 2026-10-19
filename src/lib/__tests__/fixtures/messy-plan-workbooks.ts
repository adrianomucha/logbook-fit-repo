/**
 * Plan spreadsheets laid out the way coaches actually write them — none of
 * them in the template's shape. Used by the plan-import tests, and by
 * scripts/plan-import-ai-smoke.ts to try the AI reader against a real model.
 */

import ExcelJS from "exceljs";

export type MessyPlanFile = { filename: string; buffer: Buffer };

/** A column per week, "sets x reps @ load" in one cell, day labels merged down the rows. */
export async function columnPerWeekPlan(): Promise<MessyPlanFile> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Program");
  sheet.addRow(["Strength Block — 4 weeks"]);
  sheet.mergeCells("A1:F1");
  sheet.addRow(["Day", "Exercise", "Week 1", "Week 2", "Week 3", "Week 4"]);
  sheet.addRow(["Mon - Upper", "Bench Press", "3x8 @ 60kg", "3x8 @ 62.5kg", "4x6 @ 65kg", "3x5 @ 67.5kg"]);
  sheet.addRow(["", "Barbell Row", "3x10 @ 50kg", "3x10 @ 52.5kg", "4x8 @ 55kg", "3x8 @ 55kg"]);
  sheet.addRow(["", "Plank", "3x45s", "3x50s", "3x60s", "3x60s"]);
  sheet.mergeCells("A3:A5");
  sheet.addRow(["Thu - Lower", "Back Squat", "3x8 @ 80kg", "3x8 @ 85kg", "4x6 @ 90kg", "3x5 @ 92.5kg"]);
  sheet.addRow(["", "Romanian Deadlift", "3x10 @ 60kg", "3x10 @ 60kg", "3x8 @ 65kg", "3x8 @ 65kg"]);
  sheet.mergeCells("A6:A7");
  sheet.addRow([]);
  sheet.addRow(["Rest 2-3 min on main lifts, 90s on accessories."]);
  return { filename: "strength-block.xlsx", buffer: Buffer.from(await workbook.xlsx.writeBuffer()) };
}

/** A tab per week, A1/A2 superset labels, %1RM instead of loads, a hidden calc sheet. */
export async function tabPerWeekPlan(): Promise<MessyPlanFile> {
  const workbook = new ExcelJS.Workbook();
  for (const [week, percent] of [[1, 0.7], [2, 0.75]] as const) {
    const sheet = workbook.addWorksheet(`Week ${week}`);
    sheet.addRow(["MONDAY — PUSH"]);
    sheet.mergeCells("A1:E1");
    sheet.addRow(["", "Exercise", "Sets x Reps", "Intensity", "Rest"]);
    sheet.addRow(["A1", "Overhead Press", "4 x 6-8", percent, "2 min"]);
    sheet.getCell("D3").numFmt = "0%";
    sheet.addRow(["A2", "Pull-ups", "4 x AMRAP", "BW", "2 min"]);
    sheet.addRow(["B", "Incline DB Press", "3 x 10-12", "RPE 8", "90s"]);
    sheet.addRow([]);
    sheet.addRow(["FRIDAY — LEGS"]);
    sheet.mergeCells("A7:E7");
    sheet.addRow(["", "Exercise", "Sets x Reps", "Intensity", "Rest"]);
    sheet.addRow(["A", "Front Squat", "5 x 5", percent, "3 min"]);
    sheet.getCell("D9").numFmt = "0%";
    sheet.addRow(["B", "Walking Lunge", "3 x 12/leg", "", "90s"]);
  }
  const calc = workbook.addWorksheet("1RM calc");
  calc.state = "hidden";
  calc.addRow(["Overhead Press 1RM", 60]);
  return { filename: "push-legs-weeks.xlsx", buffer: Buffer.from(await workbook.xlsx.writeBuffer()) };
}

/** A CSV export with day headings as rows and loads in pounds. */
export function csvPlan(): MessyPlanFile {
  const csv = [
    "Workout,Exercise,Prescription,Load,Notes",
    "Day 1 Full Body,,,,",
    ",Goblet Squat,3 sets of 12,35 lb,3s down",
    ",Push-up,3 x 10,,",
    ",Bike,1 x 10 min,,easy pace",
    "Day 2 Full Body,,,,",
    ",Deadlift,4x5,185 lb,",
    ",DB Row,3x10 each arm,40 lb,",
  ].join("\n");
  return { filename: "client-plan.csv", buffer: Buffer.from(csv) };
}

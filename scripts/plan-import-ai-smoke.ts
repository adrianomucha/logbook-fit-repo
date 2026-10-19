/**
 * Try the plan-import AI reader against the real model, outside the app.
 *
 *   ANTHROPIC_API_KEY=sk-ant-... npx tsx scripts/plan-import-ai-smoke.ts [file ...]
 *
 * With no files it reads the messy sample plans in
 * src/lib/__tests__/fixtures/messy-plan-workbooks.ts. Prints what the coach
 * would see in the review step (or the errors), plus the model's token use.
 *
 *   npx tsx scripts/plan-import-ai-smoke.ts --save-fixtures ./samples
 *
 * writes those sample plans to disk instead, to upload through the app.
 */

import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { formatPrescription } from "../packages/shared/src/reps";
import { parseImportRows } from "../src/lib/plan-import";
import { findTemplateRows, loadWorkbook, workbookToText } from "../src/lib/plan-import-xlsx";
import { aiImportConfigured, readPlanWithAi } from "../src/lib/plan-import-ai";
import {
  columnPerWeekPlan,
  csvPlan,
  tabPerWeekPlan,
  type MessyPlanFile,
} from "../src/lib/__tests__/fixtures/messy-plan-workbooks";

async function samplePlans(): Promise<MessyPlanFile[]> {
  return [await columnPerWeekPlan(), await tabPerWeekPlan(), csvPlan()];
}

async function readOne(file: MessyPlanFile): Promise<void> {
  console.log(`\n━━ ${file.filename}`);
  const loaded = await loadWorkbook(file.buffer, file.filename);
  if (!loaded.ok) return console.log(`✗ ${loaded.error}`);

  let rows = findTemplateRows(loaded.workbook);
  if (rows) {
    console.log("Matched the template — no AI call.");
  } else {
    const text = workbookToText(loaded.workbook);
    if (!text.ok) return console.log(`✗ ${text.error}`);
    const started = Date.now();
    const read = await readPlanWithAi(text.text);
    console.log(`AI read in ${((Date.now() - started) / 1000).toFixed(1)}s`);
    if (!read.ok) return console.log(`✗ ${read.error}`);
    rows = read.rows;
    for (const warning of read.warnings) console.log(`⚠ ${warning}`);
  }

  const { plan, errors } = parseImportRows(rows, "KG");
  if (!plan) {
    for (const e of errors) console.log(`✗ ${e.sheet ? `${e.sheet}, row` : "Row"} ${e.row}: ${e.message}`);
    return;
  }
  console.log(`${plan.durationWeeks} weeks × ${plan.workoutsPerWeek} workouts`);
  for (const week of plan.weeks) {
    console.log(`  Week ${week.weekNumber}`);
    for (const day of week.days) {
      console.log(`    ${day.name}`);
      for (const e of day.exercises) {
        const rest = e.restSeconds != null ? ` · rest ${e.restSeconds}s` : "";
        const notes = e.coachNotes ? ` — ${e.coachNotes}` : "";
        console.log(`      ${e.supersetWithPrevious ? "↳ " : ""}${e.name}: ${formatPrescription(e, "KG")}${rest}${notes}`);
      }
    }
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args[0] === "--save-fixtures") {
    const dir = args[1] ?? ".";
    await mkdir(dir, { recursive: true });
    for (const file of await samplePlans()) {
      await writeFile(path.join(dir, file.filename), file.buffer);
      console.log(`Wrote ${path.join(dir, file.filename)}`);
    }
    return;
  }

  if (!aiImportConfigured()) {
    console.error("Set ANTHROPIC_API_KEY to call the model.");
    process.exit(1);
  }

  const files = args.length
    ? await Promise.all(args.map(async (p) => ({ filename: path.basename(p), buffer: await readFile(p) })))
    : await samplePlans();
  for (const file of files) await readOne(file);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

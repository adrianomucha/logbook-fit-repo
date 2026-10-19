import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import {
  buildPlanTemplateWorkbook,
  findTemplateRows,
  loadWorkbook,
  MAX_WORKBOOK_TEXT_CHARS,
  workbookToText,
} from '../plan-import-xlsx';
import { parseImportRows } from '../plan-import';
import { columnPerWeekPlan, csvPlan, tabPerWeekPlan } from './fixtures/messy-plan-workbooks';

async function load(file: { filename: string; buffer: Buffer }): Promise<ExcelJS.Workbook> {
  const loaded = await loadWorkbook(file.buffer, file.filename);
  if (!loaded.ok) throw new Error(loaded.error);
  return loaded.workbook;
}

describe('loadWorkbook', () => {
  it('opens .xlsx by content, whatever the filename', async () => {
    const { buffer } = await columnPerWeekPlan();
    const loaded = await loadWorkbook(buffer, 'plan.bin');
    expect(loaded.ok).toBe(true);
  });

  it('opens CSV and keeps cells as typed (no "6-8" → date)', async () => {
    const loaded = await loadWorkbook(Buffer.from('Exercise,Reps\nSquat,6-8\n'), 'plan.CSV');
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.workbook.worksheets[0].getCell('B2').value).toBe('6-8');
  });

  it('asks for .xlsx when given a legacy .xls file', async () => {
    const xls = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    const loaded = await loadWorkbook(xls, 'plan.xls');
    expect(loaded).toEqual({ ok: false, error: expect.stringContaining('.xlsx') });
  });

  it('rejects anything else', async () => {
    expect((await loadWorkbook(Buffer.from('hello'), 'notes.txt')).ok).toBe(false);
    expect((await loadWorkbook(Buffer.from([0x50, 0x4b, 0x03, 0x04, 0, 0]), 'broken.xlsx')).ok).toBe(false);
  });
});

describe('findTemplateRows', () => {
  it('reads the downloadable template', async () => {
    const workbook = await load({
      filename: 'template.xlsx',
      buffer: Buffer.from(await buildPlanTemplateWorkbook()),
    });
    const rows = findTemplateRows(workbook);
    expect(rows).not.toBeNull();
    const { plan, errors } = parseImportRows(rows!);
    expect(errors).toEqual([]);
    expect(plan!.weeks[0].days[0].exercises[0].name).toBe('Barbell Bench Press');
  });

  it('returns null for layouts it can’t map, so the AI reader takes over', async () => {
    expect(findTemplateRows(await load(await columnPerWeekPlan()))).toBeNull();
    expect(findTemplateRows(await load(await tabPerWeekPlan()))).toBeNull();
    expect(findTemplateRows(await load(csvPlan()))).toBeNull();
  });
});

describe('workbookToText', () => {
  it('lists cells with addresses, merged ranges once, per sheet', async () => {
    const text = workbookToText(await load(await columnPerWeekPlan()));
    expect(text.ok).toBe(true);
    if (!text.ok) return;
    const lines = text.text.split('\n');
    expect(lines[0]).toBe('Sheet "Program"');
    expect(lines[1]).toBe('Row 1: A1 (merged A1:F1) "Strength Block — 4 weeks"');
    expect(text.text).toContain('Row 3: A3 (merged A3:A5) "Mon - Upper" | B3 "Bench Press" | C3 "3x8 @ 60kg"');
    // The merged day label is not repeated on the rows it spans
    expect(text.text).toContain('Row 4: B4 "Barbell Row"');
  });

  it('shows percentages as the coach sees them and skips hidden sheets', async () => {
    const text = workbookToText(await load(await tabPerWeekPlan()));
    expect(text.ok).toBe(true);
    if (!text.ok) return;
    expect(text.text).toContain('D3 "70%"');
    expect(text.text).toContain('Sheet "Week 2"');
    expect(text.text).not.toContain('1RM calc');
  });

  it('shows dates plainly, so a rep range Excel turned into one is recognisable', () => {
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet('Plan').addRow(['Squat', new Date(Date.UTC(2026, 5, 8))]);
    const text = workbookToText(workbook);
    expect(text).toEqual({ ok: true, text: 'Sheet "Plan"\nRow 1: A1 "Squat" | B1 "2026-06-08"' });
  });

  it('refuses empty and oversized workbooks instead of truncating', () => {
    const empty = new ExcelJS.Workbook();
    empty.addWorksheet('Blank');
    expect(workbookToText(empty).ok).toBe(false);

    const huge = new ExcelJS.Workbook();
    const sheet = huge.addWorksheet('Huge');
    const cell = 'x'.repeat(400);
    for (let i = 0; i < MAX_WORKBOOK_TEXT_CHARS / 400; i++) sheet.addRow([cell]);
    expect(workbookToText(huge)).toEqual({ ok: false, error: expect.stringContaining('too big') });
  });
});

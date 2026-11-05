import { describe, expect, it } from 'vitest';
import { deflateRawSync } from 'zlib';
import {
  buildPlanTemplateWorkbook,
  checkXlsxArchive,
  csvFieldCount,
  FILE_TOO_COMPLEX_ERROR,
  loadWorkbook,
  UPLOAD_EXPANSION_LIMITS,
} from '../plan-import-xlsx';
import { columnPerWeekPlan, tabPerWeekPlan } from './fixtures/messy-plan-workbooks';

type Entry = { name: string; data: Buffer; stored?: boolean; declaredSize?: number };

/**
 * A minimal zip writer, so tests control every header field (including the
 * declared uncompressed size a bomb would lie about).
 */
function zip(entries: Entry[], opts: { prepend?: Buffer } = {}): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  // Offsets ignore `prepend`, like a file with junk glued to the front
  let offset = 0;
  for (const e of entries) {
    const body = e.stored ? e.data : deflateRawSync(e.data);
    const name = Buffer.from(e.name);
    const declared = e.declaredSize ?? e.data.length;

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(e.stored ? 0 : 8, 8);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(declared, 22);
    local.writeUInt16LE(name.length, 26);
    locals.push(local, name, body);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(e.stored ? 0 : 8, 10);
    central.writeUInt32LE(body.length, 20);
    central.writeUInt32LE(declared, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, name);

    offset += 30 + name.length + body.length;
  }
  const cen = Buffer.concat(centrals);
  const cenOffset = offset;
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(cen.length, 12);
  eocd.writeUInt32LE(cenOffset, 16);
  return Buffer.concat([...(opts.prepend ? [opts.prepend] : []), ...locals, cen, eocd]);
}

const MB = 1024 * 1024;
const small = { maxInflatedBytes: 1 * MB, maxEntries: 10 };

describe('checkXlsxArchive', () => {
  it('accepts real plan workbooks', async () => {
    const template = Buffer.from(await buildPlanTemplateWorkbook());
    expect(checkXlsxArchive(template)).toEqual({ ok: true });
    expect(checkXlsxArchive((await columnPerWeekPlan()).buffer)).toEqual({ ok: true });
    expect(checkXlsxArchive((await tabPerWeekPlan()).buffer)).toEqual({ ok: true });
  });

  it('accepts an archive right at the inflated-size limit', () => {
    const archive = zip([{ name: 'a', data: Buffer.alloc(1 * MB, 'a') }]);
    expect(checkXlsxArchive(archive, small)).toEqual({ ok: true });
  });

  it('refuses a deflate bomb', () => {
    const archive = zip([{ name: 'xl/worksheets/sheet1.xml', data: Buffer.alloc(2 * MB, 'a') }]);
    expect(archive.length).toBeLessThan(10 * 1024);
    expect(checkXlsxArchive(archive, small)).toEqual({ ok: false, reason: 'too_large' });
  });

  it('measures what entries inflate to, not what they declare', () => {
    const archive = zip([
      { name: 'xl/worksheets/sheet1.xml', data: Buffer.alloc(2 * MB, 'a'), declaredSize: 100 },
    ]);
    expect(checkXlsxArchive(archive, small)).toEqual({ ok: false, reason: 'too_large' });
  });

  it('adds up every entry, including stored ones', () => {
    const archive = zip([
      { name: 'a', data: Buffer.alloc(0.6 * MB, 'a') },
      { name: 'b', data: Buffer.alloc(0.6 * MB, 'b'), stored: true },
    ]);
    expect(checkXlsxArchive(archive, small)).toEqual({ ok: false, reason: 'too_large' });
  });

  it('refuses too many entries', () => {
    const entries = Array.from({ length: 11 }, (_, i) => ({ name: `e${i}`, data: Buffer.from('x') }));
    expect(checkXlsxArchive(zip(entries), small)).toEqual({ ok: false, reason: 'too_large' });
  });

  it('refuses archives it cannot read the way exceljs would', () => {
    const fine = zip([{ name: 'a', data: Buffer.from('hello') }]);
    expect(checkXlsxArchive(fine, small)).toEqual({ ok: true });

    // Prepended bytes make JSZip shift every offset; don't try to follow it
    const prepended = zip([{ name: 'a', data: Buffer.from('hello') }], { prepend: Buffer.from('junk') });
    expect(checkXlsxArchive(prepended, small)).toEqual({ ok: false, reason: 'unreadable' });

    // Truncated: no end-of-central-directory record
    expect(checkXlsxArchive(fine.subarray(0, fine.length - 5), small)).toEqual({
      ok: false,
      reason: 'unreadable',
    });

    // ZIP64 marker in the entry count
    const zip64 = Buffer.from(fine);
    zip64.writeUInt16LE(0xffff, zip64.length - 22 + 10);
    expect(checkXlsxArchive(zip64, small)).toEqual({ ok: false, reason: 'unreadable' });

    // Unknown compression method
    const bzip = Buffer.from(fine);
    const cen = bzip.readUInt32LE(bzip.length - 22 + 16);
    bzip.writeUInt16LE(12, cen + 10);
    expect(checkXlsxArchive(bzip, small)).toEqual({ ok: false, reason: 'unreadable' });
  });
});

describe('csvFieldCount', () => {
  it('counts fields generously', () => {
    expect(csvFieldCount(Buffer.from('a'))).toBe(1);
    expect(csvFieldCount(Buffer.from('a,b\nc,d'))).toBe(4);
  });
});

describe('loadWorkbook upload limits', () => {
  it('refuses an .xlsx bomb before exceljs parses it', async () => {
    const bomb = zip([
      {
        name: 'xl/worksheets/sheet1.xml',
        data: Buffer.alloc(UPLOAD_EXPANSION_LIMITS.maxXlsxInflatedBytes + 1, 'a'),
      },
    ]);
    expect(bomb.length).toBeLessThan(64 * 1024);
    expect(await loadWorkbook(bomb, 'plan.xlsx')).toEqual({ ok: false, error: FILE_TOO_COMPLEX_ERROR });
  });

  it('refuses a CSV with too many fields', async () => {
    const csv = Buffer.from(','.repeat(UPLOAD_EXPANSION_LIMITS.maxCsvFields));
    expect(await loadWorkbook(csv, 'plan.csv')).toEqual({ ok: false, error: FILE_TOO_COMPLEX_ERROR });
  });

  it('still opens a plan-sized CSV', async () => {
    const row = 'Week 1,Day 1,Squat,3,8,100,90,notes\n';
    const loaded = await loadWorkbook(Buffer.from(row.repeat(2000)), 'plan.csv');
    expect(loaded.ok).toBe(true);
  });
});

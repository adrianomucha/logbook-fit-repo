import { describe, expect, it } from 'vitest';
import {
  collectImportExercises,
  applyImportChoices,
  importErrorBody,
  looksLikeDuration,
  matchHeader,
  parseImportRows,
  type RawImportRow,
} from '../plan-import';

/** Row builder: only override what the case is about. */
function row(overrides: Partial<RawImportRow> & { rowNumber: number }): RawImportRow {
  return {
    week: '1',
    day: '1',
    dayName: null,
    exercise: 'Bench Press',
    sets: '3',
    reps: '10',
    weight: null,
    rest: null,
    notes: null,
    superset: null,
    ...overrides,
  };
}

describe('matchHeader', () => {
  it('matches template headers regardless of case and punctuation', () => {
    expect(matchHeader('Week')).toBe('week');
    expect(matchHeader('  DAY ')).toBe('day');
    expect(matchHeader('Day Name')).toBe('dayName');
    expect(matchHeader('Exercise')).toBe('exercise');
    expect(matchHeader('Reps / Time')).toBe('reps');
    expect(matchHeader('Rest (sec)')).toBe('rest');
    expect(matchHeader('Superset')).toBe('superset');
  });

  it('accepts common synonyms and rejects unknown headers', () => {
    expect(matchHeader('Movement')).toBe('exercise');
    expect(matchHeader('Load')).toBe('weight');
    expect(matchHeader('Coach Notes')).toBe('notes');
    expect(matchHeader('Tempo')).toBeNull();
  });
});

describe('looksLikeDuration', () => {
  it('spots time markers', () => {
    expect(looksLikeDuration('45s')).toBe(true);
    expect(looksLikeDuration('2 min')).toBe(true);
    expect(looksLikeDuration('1:30')).toBe(true);
    expect(looksLikeDuration('20-30 min')).toBe(true);
  });

  it('leaves rep counts alone', () => {
    expect(looksLikeDuration('8')).toBe(false);
    expect(looksLikeDuration('6-8')).toBe(false);
    expect(looksLikeDuration('8 reps')).toBe(false);
  });
});

describe('parseImportRows', () => {
  it('builds the plan tree from valid rows', () => {
    const { plan, errors } = parseImportRows([
      row({ rowNumber: 2, dayName: 'Upper Body', sets: '4', reps: '6-8', weight: '60', rest: '120', notes: 'Pause on the chest' }),
      row({ rowNumber: 3, exercise: 'Barbell Rows', sets: '4', reps: '8-10' }),
      row({ rowNumber: 4, day: '2', dayName: 'Lower Body', exercise: 'Squat', sets: '4', reps: '5' }),
      row({ rowNumber: 5, week: '2', exercise: 'Bench Press', sets: '3', reps: '8' }),
    ]);

    expect(errors).toEqual([]);
    expect(plan).not.toBeNull();
    expect(plan!.durationWeeks).toBe(2);
    expect(plan!.workoutsPerWeek).toBe(2);

    const day1 = plan!.weeks[0].days[0];
    expect(day1.name).toBe('Upper Body');
    expect(day1.exercises).toHaveLength(2);
    expect(day1.exercises[0]).toMatchObject({
      name: 'Bench Press',
      trackingType: 'REPS',
      sets: 4,
      reps: 6,
      repsMax: 8,
      weight: 60,
      restSeconds: 120,
      coachNotes: 'Pause on the chest',
    });

    // Week 2 only listed day 1 — the grid still scaffolds day 2 empty,
    // matching the shape POST /api/plans creates
    expect(plan!.weeks[1].days).toHaveLength(2);
    expect(plan!.weeks[1].days[1].exercises).toEqual([]);
    expect(plan!.weeks[1].days[1].name).toBe('Day 2');
  });

  it('detects time-based prescriptions from the reps cell', () => {
    const { plan, errors } = parseImportRows([
      row({ rowNumber: 2, exercise: 'Plank', reps: '45s' }),
      row({ rowNumber: 3, exercise: 'Farmer Carry', reps: '1:30' }),
    ]);
    expect(errors).toEqual([]);
    const [plank, carry] = plan!.weeks[0].days[0].exercises;
    expect(plank).toMatchObject({ trackingType: 'TIME', reps: 45, repsMax: null });
    expect(carry).toMatchObject({ trackingType: 'TIME', reps: 90 });
  });

  it('marks supersets, but never on the first exercise of a day', () => {
    const { plan } = parseImportRows([
      row({ rowNumber: 2, superset: 'Y' }),
      row({ rowNumber: 3, exercise: 'Lateral Raises', superset: 'yes' }),
      row({ rowNumber: 4, exercise: 'Curls', superset: 'no' }),
    ]);
    const exercises = plan!.weeks[0].days[0].exercises;
    expect(exercises.map((e) => e.supersetWithPrevious)).toEqual([false, true, false]);
  });

  it('tolerates decorated cells: "Week 1", "60 kg", "90 sec"', () => {
    const { plan, errors } = parseImportRows([
      row({ rowNumber: 2, week: 'Week 1', day: 'Day 1', weight: '60 kg', rest: '90 sec' }),
    ]);
    expect(errors).toEqual([]);
    const exercise = plan!.weeks[0].days[0].exercises[0];
    // "60 kg" names its unit, so it converts to lb even for an lb coach
    expect(exercise.weight).toBe(132.5);
    expect(exercise.restSeconds).toBe(90);
  });

  it('reads unlabelled weights in the coach unit and stores lb', () => {
    const { plan, errors } = parseImportRows(
      [
        row({ rowNumber: 2, exercise: 'Squat', weight: '100' }),
        row({ rowNumber: 3, exercise: 'Bench', weight: '135 lb' }),
      ],
      'KG'
    );
    expect(errors).toEqual([]);
    const [squat, bench] = plan!.weeks[0].days[0].exercises;
    expect(squat.weight).toBe(220.5);
    expect(bench.weight).toBe(135);
  });

  it('lets a row name a day without prescribing an exercise', () => {
    const { plan, errors } = parseImportRows([
      row({ rowNumber: 2, dayName: 'Push Day', exercise: null, sets: null, reps: null }),
      row({ rowNumber: 3, exercise: 'Bench Press' }),
    ]);
    expect(errors).toEqual([]);
    const day = plan!.weeks[0].days[0];
    expect(day.name).toBe('Push Day');
    expect(day.exercises).toHaveLength(1);
  });

  it('reports each bad row with its Excel row number', () => {
    const { plan, errors } = parseImportRows([
      row({ rowNumber: 2 }),
      row({ rowNumber: 3, week: '13' }),
      row({ rowNumber: 4, day: '8' }),
      row({ rowNumber: 5, sets: '0' }),
      row({ rowNumber: 6, reps: null }),
      row({ rowNumber: 7, weight: '-5' }),
      row({ rowNumber: 8, rest: '999' }),
    ]);
    expect(plan).toBeNull();
    expect(errors.map((e) => e.row)).toEqual([3, 4, 5, 6, 7, 8]);
  });

  it('rejects an effectively empty sheet', () => {
    const { plan, errors } = parseImportRows([
      row({ rowNumber: 2, week: null, day: null, dayName: null, exercise: null, sets: null, reps: null }),
    ]);
    expect(plan).toBeNull();
    expect(errors).toHaveLength(1);
    expect(errors[0].row).toBe(0);
  });

  it('rejects unparseable prescriptions instead of guessing', () => {
    const { plan, errors } = parseImportRows([
      row({ rowNumber: 2, reps: 'to failure' }),
    ]);
    expect(plan).toBeNull();
    expect(errors[0].row).toBe(2);
  });

  it('names the coach’s own sheet in errors for rows read from a free-form workbook', () => {
    const { errors } = parseImportRows([
      row({ rowNumber: 7, sheet: 'Week 2', sets: '45' }),
      row({ rowNumber: 8, sets: '45' }),
    ]);
    expect(errors[0]).toEqual({ row: 7, sheet: 'Week 2', message: expect.stringContaining('Sets') });
    expect(errors[1]).not.toHaveProperty('sheet');
  });
});

describe('importErrorBody', () => {
  it('uses a file-level error as the headline and lists only row errors', () => {
    expect(importErrorBody([{ row: 0, message: 'The file has no workout rows.' }])).toEqual({
      error: 'The file has no workout rows.',
      rowErrors: [],
    });
    const body = importErrorBody([
      { row: 3, message: 'a' },
      { row: 4, sheet: 'Week 1', message: 'b' },
    ]);
    expect(body.error).toMatch(/2 problems/);
    expect(body.rowErrors).toHaveLength(2);
  });
});

describe('collectImportExercises', () => {
  it('dedupes case-insensitively, keeping first-seen casing and tracking type', () => {
    const { plan } = parseImportRows([
      row({ rowNumber: 2, exercise: 'Bench Press' }),
      row({ rowNumber: 3, exercise: 'bench press', week: '2' }),
      row({ rowNumber: 4, exercise: 'Plank', reps: '45s' }),
    ]);
    const exercises = collectImportExercises(plan!);
    expect(exercises).toEqual([
      { name: 'Bench Press', trackingType: 'REPS' },
      { name: 'Plank', trackingType: 'TIME' },
    ]);
  });
});

describe('applyImportChoices', () => {
  const rows = [
    row({ rowNumber: 3, week: '1', exercise: 'Bench Press', rest: '120' }),
    row({ rowNumber: 3, week: '2', exercise: 'bench press', rest: '120' }),
    // Same exercise, a value the sheet stated plainly — must not be touched
    row({ rowNumber: 3, week: '3', exercise: 'Bench Press', rest: '90' }),
    row({ rowNumber: 4, exercise: 'Back Squat', rest: '120' }),
  ];
  const choice = { exercise: 'Bench Press', field: 'rest' as const, said: '2-3 min rest', options: ['120', '150', '180'] };

  it('replaces the reader’s guess for that exercise only, in every week', () => {
    const out = applyImportChoices(rows, [choice], ['150']);
    expect(out.map((r) => r.rest)).toEqual(['150', '150', '90', '120']);
  });

  it('leaves rows untouched for the guess itself or no pick', () => {
    expect(applyImportChoices(rows, [choice], ['120'])).toEqual(rows);
    expect(applyImportChoices(rows, [choice], [undefined])).toEqual(rows);
  });

  it('feeds parseImportRows, which still checks the coach’s own value', () => {
    expect(parseImportRows(applyImportChoices(rows, [choice], ['150'])).errors).toEqual([]);
    const { errors } = parseImportRows(applyImportChoices(rows, [choice], ['9000']));
    expect(errors[0].message).toMatch(/Rest/);
  });
});

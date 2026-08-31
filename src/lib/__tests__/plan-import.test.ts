import { describe, expect, it } from 'vitest';
import {
  collectImportExercises,
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
    expect(plan!.weeks[0].days[0].exercises[0]).toMatchObject({
      weight: 60,
      restSeconds: 90,
    });
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

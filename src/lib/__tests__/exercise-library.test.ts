import { describe, expect, it } from 'vitest';
import { buildLibraryRows, filterLibraryRows, type ExerciseTemplate, type OwnExercise } from '../exercise-library';

const starters: ExerciseTemplate[] = [
  { id: 'bench-press', name: 'Barbell Bench Press', category: 'chest', equipment: 'Barbell', defaultSets: 4, defaultReps: '8-10' },
  { id: 'deadlift', name: 'Deadlift', category: 'back', equipment: 'Barbell', defaultSets: 4, defaultReps: '6-8' },
];

const own = (over: Partial<OwnExercise> & { id: string; name: string }): OwnExercise => ({
  category: 'OTHER',
  trackingType: 'REPS',
  defaultSets: 3,
  defaultReps: 10,
  instructions: null,
  ...over,
});

describe('buildLibraryRows', () => {
  it('is just the starters for a coach with nothing saved', () => {
    const rows = buildLibraryRows([], starters);
    expect(rows.map((r) => r.name)).toEqual(['Barbell Bench Press', 'Deadlift']);
    expect(rows.every((r) => r.ownId === undefined)).toBe(true);
  });

  it("puts the coach's own exercises first, A to Z", () => {
    const rows = buildLibraryRows(
      [own({ id: 'b', name: 'Zercher Squat' }), own({ id: 'a', name: 'Copenhagen Plank' })],
      starters
    );
    expect(rows.map((r) => r.name)).toEqual(['Copenhagen Plank', 'Zercher Squat', 'Barbell Bench Press', 'Deadlift']);
    expect(rows[0].ownId).toBe('a');
  });

  it('shows a starter the coach has used once, as theirs, whatever the casing', () => {
    const rows = buildLibraryRows([own({ id: 'x', name: 'deadlift' })], starters);
    expect(rows.filter((r) => r.name.toLowerCase() === 'deadlift')).toHaveLength(1);
    expect(rows[0]).toMatchObject({ ownId: 'x', category: 'back', equipment: 'Barbell', defaultReps: '6-8' });
  });

  it("keeps the coach's own category and reads TIME defaults as a duration", () => {
    const [row] = buildLibraryRows(
      [own({ id: 'p', name: 'Plank', category: 'FULL_BODY', trackingType: 'TIME', defaultReps: 90 })],
      starters
    );
    expect(row).toMatchObject({ category: 'full body', trackingType: 'TIME', defaultReps: '1m 30s' });
  });

  it('gives every row a unique key', () => {
    const rows = buildLibraryRows([own({ id: 'x', name: 'Deadlift' }), own({ id: 'y', name: 'Sled Push' })], starters);
    expect(new Set(rows.map((r) => r.key)).size).toBe(rows.length);
  });
});

describe('filterLibraryRows', () => {
  const rows = buildLibraryRows([own({ id: 'y', name: 'Sled Push', category: 'LEGS' })], starters);

  it('searches name, category and equipment', () => {
    expect(filterLibraryRows(rows, 'sled', null).map((r) => r.name)).toEqual(['Sled Push']);
    expect(filterLibraryRows(rows, 'barbell', null)).toHaveLength(2);
    expect(filterLibraryRows(rows, 'LEGS', null).map((r) => r.name)).toEqual(['Sled Push']);
  });

  it('filters by category when there is no search, and search wins over the chip', () => {
    expect(filterLibraryRows(rows, '', 'back').map((r) => r.name)).toEqual(['Deadlift']);
    expect(filterLibraryRows(rows, 'sled', 'back').map((r) => r.name)).toEqual(['Sled Push']);
  });

  it('returns everything with no filter', () => {
    expect(filterLibraryRows(rows, '  ', null)).toHaveLength(3);
  });
});

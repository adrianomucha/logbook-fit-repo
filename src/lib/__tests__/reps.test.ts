import { describe, expect, it } from 'vitest';
import {
  formatClock,
  formatDuration,
  formatReps,
  parseDurationInput,
  parsePrescriptionInput,
  parseRepsInput,
} from '../reps';

describe('formatClock', () => {
  it('renders m:ss with zero-padded seconds', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(5)).toBe('0:05');
    expect(formatClock(47)).toBe('0:47');
    expect(formatClock(90)).toBe('1:30');
    expect(formatClock(600)).toBe('10:00');
  });

  it('ceils fractional seconds so a countdown never shows 0:00 early', () => {
    expect(formatClock(46.2)).toBe('0:47');
    expect(formatClock(0.4)).toBe('0:01');
  });

  it('clamps negatives to 0:00', () => {
    expect(formatClock(-3)).toBe('0:00');
  });
});

describe('formatReps', () => {
  it('formats rep counts and ranges', () => {
    expect(formatReps(8)).toBe('8');
    expect(formatReps(6, 8)).toBe('6-8');
    expect(formatReps(8, 8)).toBe('8');
    expect(formatReps(8, null)).toBe('8');
  });

  it('formats TIME prescriptions as durations', () => {
    expect(formatReps(45, null, 'TIME')).toBe('45s');
    expect(formatReps(60, null, 'TIME')).toBe('1 min');
    expect(formatReps(90, null, 'TIME')).toBe('1m 30s');
    expect(formatReps(30, 60, 'TIME')).toBe('30s-1 min');
    expect(formatReps(30, 45, 'TIME')).toBe('30-45s');
    expect(formatReps(1200, 1800, 'TIME')).toBe('20-30 min');
  });
});

describe('formatDuration', () => {
  it('picks the most compact unit', () => {
    expect(formatDuration(45)).toBe('45s');
    expect(formatDuration(60)).toBe('1 min');
    expect(formatDuration(90)).toBe('1m 30s');
    expect(formatDuration(120)).toBe('2 min');
    expect(formatDuration(1800)).toBe('30 min');
  });
});

describe('parseDurationInput', () => {
  it('parses plain seconds', () => {
    expect(parseDurationInput('60')).toEqual({ reps: 60, repsMax: null });
    expect(parseDurationInput('45s')).toEqual({ reps: 45, repsMax: null });
    expect(parseDurationInput('45 sec')).toEqual({ reps: 45, repsMax: null });
    expect(parseDurationInput(90)).toEqual({ reps: 90, repsMax: null });
  });

  it('parses minutes', () => {
    expect(parseDurationInput('2 min')).toEqual({ reps: 120, repsMax: null });
    expect(parseDurationInput('2m')).toEqual({ reps: 120, repsMax: null });
    expect(parseDurationInput('1.5 min')).toEqual({ reps: 90, repsMax: null });
  });

  it('parses colon and combined notation', () => {
    expect(parseDurationInput('1:30')).toEqual({ reps: 90, repsMax: null });
    expect(parseDurationInput('1m 30s')).toEqual({ reps: 90, repsMax: null });
    expect(parseDurationInput('1min30s')).toEqual({ reps: 90, repsMax: null });
  });

  it('parses ranges, inheriting the unit from the right bound', () => {
    expect(parseDurationInput('30-60s')).toEqual({ reps: 30, repsMax: 60 });
    expect(parseDurationInput('20-30 min')).toEqual({ reps: 1200, repsMax: 1800 });
    expect(parseDurationInput('1:00 - 1:30')).toEqual({ reps: 60, repsMax: 90 });
    expect(parseDurationInput('60-45s')).toEqual({ reps: 45, repsMax: 60 });
    expect(parseDurationInput('60-60s')).toEqual({ reps: 60, repsMax: null });
  });

  it('round-trips its own display format', () => {
    for (const [reps, repsMax] of [
      [45, null],
      [90, null],
      [30, 60],
      [1200, 1800],
    ] as const) {
      const display = formatReps(reps, repsMax, 'TIME');
      expect(parseDurationInput(display)).toEqual({ reps, repsMax });
    }
  });

  it('returns nulls for unparseable input', () => {
    expect(parseDurationInput('')).toEqual({ reps: null, repsMax: null });
    expect(parseDurationInput(null)).toEqual({ reps: null, repsMax: null });
    expect(parseDurationInput('hold it')).toEqual({ reps: null, repsMax: null });
  });
});

describe('parsePrescriptionInput', () => {
  it('routes to the right grammar per tracking type', () => {
    expect(parsePrescriptionInput('8-12', 'REPS')).toEqual({ reps: 8, repsMax: 12 });
    expect(parsePrescriptionInput('30-60s', 'TIME')).toEqual({ reps: 30, repsMax: 60 });
    // "2 min" through the reps grammar would be a nonsense "2"; TIME gets 120
    expect(parsePrescriptionInput('2 min', 'TIME')).toEqual({ reps: 120, repsMax: null });
  });
});

describe('parseRepsInput (unchanged behaviour)', () => {
  it('parses counts and ranges', () => {
    expect(parseRepsInput('8')).toEqual({ reps: 8, repsMax: null });
    expect(parseRepsInput('6-8')).toEqual({ reps: 6, repsMax: 8 });
    expect(parseRepsInput('8-6')).toEqual({ reps: 6, repsMax: 8 });
    expect(parseRepsInput('')).toEqual({ reps: null, repsMax: null });
  });
});

import { describe, expect, it } from 'vitest';
import { AUTO_FINISHED_COPY, sessionCompleteEyebrow } from '../auto-finish';

describe('sessionCompleteEyebrow', () => {
  it('says the workout is complete when the client finished it', () => {
    expect(sessionCompleteEyebrow('2', false)).toBe('Workout complete · Day 2');
    expect(sessionCompleteEyebrow(undefined, undefined)).toBe('Workout complete');
  });

  it('says it was auto-finished when the idle sweep finished it', () => {
    expect(sessionCompleteEyebrow('2', true)).toBe(`${AUTO_FINISHED_COPY.label} · Day 2`);
    expect(sessionCompleteEyebrow(undefined, true)).toBe(AUTO_FINISHED_COPY.label);
  });
});

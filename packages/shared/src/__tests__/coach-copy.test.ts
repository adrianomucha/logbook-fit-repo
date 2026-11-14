import { describe, expect, it } from 'vitest';
import * as copy from '../coach-copy';
import { EMPTY_PLAN, PAST_CLIENT, PLAN_SAVE_ERROR, REMOVE_PLAN } from '../coach-copy';

/** Every string in the module, with functions called on sample arguments */
function allStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (typeof value === 'function') return allStrings((value as (...a: unknown[]) => unknown)('Sam', 'Strength'));
  if (value && typeof value === 'object') return Object.values(value).flatMap(allStrings);
  return [];
}

describe('coach copy', () => {
  it('never uses an em dash', () => {
    for (const text of allStrings(copy)) expect(text).not.toContain(String.fromCharCode(0x2014));
  });

  it('warns that removing a plan loses the place in it, and what survives', () => {
    const text = REMOVE_PLAN.warning('Sam', 'Strength Block');
    expect(text).toContain('Sam loses their place in Strength Block');
    expect(text).toContain('week 1');
    expect(text).toContain('Past workouts stay');
    expect(REMOVE_PLAN.warning(undefined, 'Strength Block')).toMatch(/^Your client loses/);
  });

  it('names who ended a past relationship', () => {
    expect(PAST_CLIENT.ended(true, 'Mar 3, 2026')).toBe('Left Mar 3, 2026');
    expect(PAST_CLIENT.ended(false, 'Mar 3, 2026')).toBe('Ended Mar 3, 2026');
    expect(PAST_CLIENT.ended(false, null)).toBe('Ended');
  });

  it('says what was not saved for each plan builder failure', () => {
    for (const text of Object.values(PLAN_SAVE_ERROR)) expect(text).toMatch(/wasn't|weren't/);
    expect(EMPTY_PLAN.error).toContain('no exercises');
  });
});

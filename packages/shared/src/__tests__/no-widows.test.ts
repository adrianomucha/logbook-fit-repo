import { describe, expect, it } from 'vitest';
import { noWidows } from '../no-widows';

const NBSP = '\u00A0';

describe('noWidows', () => {
  it('binds the last two words so neither can be left alone', () => {
    expect(noWidows('Remove Riley Chen and all their generated data?')).toBe(
      `Remove Riley Chen and all their generated${NBSP}data?`
    );
  });

  it('leaves the rest of the string breakable', () => {
    const result = noWidows('The sample plan will be deleted');
    expect(result.split(' ')).toHaveLength(5);
    expect(result.split(NBSP)).toHaveLength(2);
  });

  it('leaves a pair alone when gluing it could overflow a narrow column', () => {
    // "Coaching Relationship" is 21 chars — bound, it would not fit the
    // title column on a 320px screen
    const title = 'End Coaching Relationship';
    expect(noWidows(title)).toBe(title);
  });

  it('respects a caller-supplied pair limit', () => {
    expect(noWidows('End Coaching Relationship', 24)).toBe(`End Coaching${NBSP}Relationship`);
  });

  it('passes through text with nothing to bind', () => {
    expect(noWidows('Delete')).toBe('Delete');
    expect(noWidows('')).toBe('');
  });

  it('binds across the trailing space rather than preserving it', () => {
    expect(noWidows('stay untouched. ')).toBe(`stay${NBSP}untouched.`);
  });

  it('is idempotent — a bound pair is not re-bound', () => {
    const once = noWidows('Remove Riley Chen and all their generated data?');
    expect(noWidows(once)).toBe(once);
  });
});

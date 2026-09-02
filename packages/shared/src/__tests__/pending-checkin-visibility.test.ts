import { describe, it, expect } from 'vitest';
import {
  hiddenPendingKey,
  readHiddenPending,
  writeHiddenPending,
  type KeyValueStorage,
} from '../pending-checkin-visibility';

function fakeStorage(): KeyValueStorage & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

describe('pending check-in visibility', () => {
  it('is visible by default', () => {
    expect(readHiddenPending(fakeStorage(), 'ci_1')).toBe(false);
  });

  it('hides and unhides one check-in without touching another', () => {
    const s = fakeStorage();
    writeHiddenPending(s, 'ci_1', true);
    expect(readHiddenPending(s, 'ci_1')).toBe(true);
    expect(readHiddenPending(s, 'ci_2')).toBe(false);

    writeHiddenPending(s, 'ci_1', false);
    expect(readHiddenPending(s, 'ci_1')).toBe(false);
    expect(s.map.has(hiddenPendingKey('ci_1'))).toBe(false);
  });

  it('treats missing or throwing storage as visible', () => {
    expect(readHiddenPending(null, 'ci_1')).toBe(false);
    const broken: KeyValueStorage = {
      getItem: () => { throw new Error('SecurityError'); },
      setItem: () => { throw new Error('SecurityError'); },
      removeItem: () => { throw new Error('SecurityError'); },
    };
    expect(() => writeHiddenPending(broken, 'ci_1', true)).not.toThrow();
    expect(readHiddenPending(broken, 'ci_1')).toBe(false);
  });
});

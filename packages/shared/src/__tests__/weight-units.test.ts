import { describe, expect, it } from 'vitest';
import {
  formatWeight,
  formatWeightNumber,
  fromDisplayWeight,
  normalizeWeightUnit,
  toDisplayWeight,
  weightUnitLabel,
} from '../weight-units';

describe('toDisplayWeight', () => {
  it('shows stored pounds as-is for lb viewers', () => {
    expect(toDisplayWeight(135, 'LB')).toBe(135);
    expect(toDisplayWeight(132.5, 'LB')).toBe(132.5);
  });

  it('converts to kg, rounded to one decimal', () => {
    expect(toDisplayWeight(135, 'KG')).toBe(61.2);
    expect(toDisplayWeight(45, 'KG')).toBe(20.4);
  });
});

describe('fromDisplayWeight', () => {
  it('passes pounds through', () => {
    expect(fromDisplayWeight(135, 'LB')).toBe(135);
  });

  it('round-trips a kg entry back to the same kg', () => {
    const stored = fromDisplayWeight(100, 'KG');
    expect(stored).toBeCloseTo(220.462, 3);
    expect(toDisplayWeight(stored, 'KG')).toBe(100);
    expect(toDisplayWeight(stored, 'LB')).toBe(220.5);
  });

  it('keeps a seeded value exact when the viewer leaves it alone', () => {
    // 135 lb shows as 61.2 kg; logging 61.2 must not drift to 134.9 lb
    expect(fromDisplayWeight(61.2, 'KG', [null, 135])).toBe(135);
    // A real change still converts
    expect(fromDisplayWeight(60, 'KG', [135])).toBeCloseTo(132.277, 3);
  });
});

describe('labels and formatting', () => {
  it('labels units', () => {
    expect(weightUnitLabel('KG')).toBe('kg');
    expect(weightUnitLabel('LB')).toBe('lb');
  });

  it('formats in the viewer unit', () => {
    expect(formatWeightNumber(135, 'KG')).toBe('61.2');
    expect(formatWeight(135, 'LB')).toBe('135 lb');
    expect(formatWeight(220.46226, 'KG')).toBe('100 kg');
  });

  it('falls back to lb for unknown input', () => {
    expect(normalizeWeightUnit('KG')).toBe('KG');
    expect(normalizeWeightUnit(undefined)).toBe('LB');
    expect(normalizeWeightUnit('stone')).toBe('LB');
  });
});

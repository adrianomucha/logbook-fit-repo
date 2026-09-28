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
  it('shows stored pounds to the nearest half for lb viewers', () => {
    expect(toDisplayWeight(135, 'LB')).toBe(135);
    expect(toDisplayWeight(132.5, 'LB')).toBe(132.5);
    expect(toDisplayWeight(44.09, 'LB')).toBe(44);
    expect(toDisplayWeight(35.3, 'LB')).toBe(35.5);
  });

  it('converts to kg, rounded to the nearest half', () => {
    expect(toDisplayWeight(135, 'KG')).toBe(61); // 61.23
    expect(toDisplayWeight(45, 'KG')).toBe(20.5); // 20.41
  });
});

describe('fromDisplayWeight', () => {
  it('passes whole and half pounds through', () => {
    expect(fromDisplayWeight(135, 'LB')).toBe(135);
    expect(fromDisplayWeight(132.5, 'LB')).toBe(132.5);
  });

  it('stores a kg entry as the nearest half pound', () => {
    expect(fromDisplayWeight(20, 'KG')).toBe(44); // 44.09
    expect(fromDisplayWeight(100, 'KG')).toBe(220.5); // 220.46
    expect(fromDisplayWeight(60, 'KG')).toBe(132.5); // 132.28
  });

  it('reads a kg entry back as the same kg', () => {
    for (let kg = 0; kg <= 300; kg += 0.5) {
      expect(toDisplayWeight(fromDisplayWeight(kg, 'KG'), 'KG')).toBe(kg);
    }
  });

  it('keeps a seeded value exact when the viewer leaves it alone', () => {
    // 135 lb shows as 61 kg; logging 61 must not drift to 134.5 lb
    expect(fromDisplayWeight(61, 'KG', [null, 135])).toBe(135);
    // A real change still converts
    expect(fromDisplayWeight(60, 'KG', [135])).toBe(132.5);
  });
});

describe('labels and formatting', () => {
  it('labels units', () => {
    expect(weightUnitLabel('KG')).toBe('kg');
    expect(weightUnitLabel('LB')).toBe('lb');
  });

  it('formats in the viewer unit', () => {
    expect(formatWeightNumber(135, 'KG')).toBe('61');
    expect(formatWeight(135, 'LB')).toBe('135 lb');
    expect(formatWeight(220.5, 'KG')).toBe('100 kg');
  });

  it('falls back to lb for unknown input', () => {
    expect(normalizeWeightUnit('KG')).toBe('KG');
    expect(normalizeWeightUnit(undefined)).toBe('LB');
    expect(normalizeWeightUnit('stone')).toBe('LB');
  });
});

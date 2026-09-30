import { describe, expect, it } from 'vitest';
import { resolveSettingsSection } from '../settings-sections';

describe('resolveSettingsSection', () => {
  it('returns a current section as is', () => {
    expect(resolveSettingsSection('profile')).toBe('profile');
    expect(resolveSettingsSection('preferences')).toBe('preferences');
    expect(resolveSettingsSection('account')).toBe('account');
  });

  it('sends old deep links to the tab that now holds them', () => {
    expect(resolveSettingsSection('password')).toBe('account');
    expect(resolveSettingsSection('notifications')).toBe('preferences');
  });

  it('falls back to Profile for anything else', () => {
    expect(resolveSettingsSection(undefined)).toBe('profile');
    expect(resolveSettingsSection(null)).toBe('profile');
    expect(resolveSettingsSection('')).toBe('profile');
    expect(resolveSettingsSection('constructor')).toBe('profile');
    expect(resolveSettingsSection(['account'])).toBe('profile');
  });
});

/**
 * Settings sections and their wording, shared by the web settings pages
 * (/coach/settings, /client/settings) and the native settings screen.
 *
 * Three tabs, each answering one question:
 *   Profile     — how others see you (photo, name, bio)
 *   Preferences — how the app works for you (alerts, units, timezone)
 *   Account     — how you sign in, and how to leave (email, password, delete)
 *
 * Icons stay with each app (lucide on web, Feather on native).
 */

export type SettingsRole = 'coach' | 'client';

export const SETTINGS_SECTION_IDS = ['profile', 'preferences', 'account'] as const;

export type SettingsSectionId = (typeof SETTINGS_SECTION_IDS)[number];

export const SETTINGS_SECTIONS: { id: SettingsSectionId; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'preferences', label: 'Preferences' },
  { id: 'account', label: 'Account' },
];

/**
 * Sections that used to be tabs of their own, so old deep links still land
 * on the tab that now holds them.
 */
const LEGACY_SECTIONS = new Map<string, SettingsSectionId>([
  ['password', 'account'],
  ['notifications', 'preferences'],
]);

/** A ?section= value off a URL → the tab to show. Unknown → Profile. */
export function resolveSettingsSection(requested: unknown): SettingsSectionId {
  if (typeof requested !== 'string') return 'profile';
  if ((SETTINGS_SECTION_IDS as readonly string[]).includes(requested)) {
    return requested as SettingsSectionId;
  }
  return LEGACY_SECTIONS.get(requested) ?? 'profile';
}

/** Line under the page title, and the Settings row on the native account menu. */
export const SETTINGS_SUMMARY = 'Your profile, preferences and sign-in';

/** Pane headings: bold title + one muted sentence. */
export const SETTINGS_SECTION_COPY: Record<
  SettingsSectionId,
  { title: string; description: Record<SettingsRole, string> }
> = {
  profile: {
    title: 'Profile',
    description: {
      coach: 'How clients see you — on invites and around the app.',
      client: 'How your coach sees you — on your card in their app.',
    },
  },
  preferences: {
    title: 'Preferences',
    description: {
      coach: 'How the app works for you — alerts, units and time.',
      client: 'How the app works for you — alerts, units and time.',
    },
  },
  account: {
    title: 'Account',
    description: {
      coach: 'How you sign in, and how to close your account.',
      client: 'How you sign in, and how to close your account.',
    },
  },
};

/** Field wording used on both apps' Preferences and Account panes. */
export const SETTINGS_FIELD_COPY = {
  email: { label: 'Email', hint: 'The address you sign in with.' },
  memberSince: { label: 'Member since' },
  password: {
    label: 'Password',
    open: 'Change password',
    cancel: 'Cancel',
    submit: 'Save new password',
    hint: 'You’ll stay signed in on this device.',
    saved: 'Password changed',
  },
  timezone: {
    label: 'Timezone',
    hint: {
      coach: 'Detected from your device — check-in schedules follow it automatically, even when you travel.',
      client: 'Detected from your device — your check-in schedule follows it, even when you travel.',
    },
  },
} as const;

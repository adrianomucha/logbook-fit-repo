/**
 * Wording for the bell in the client's chat header. The bell carries no
 * visible text, so these are its accessible names and the messages it shows
 * when tapped in a state the app can't change on its own.
 */
export const ALERTS_COPY = {
  turnOn: 'Turn on alerts',
  turnOff: 'Turn off alerts',
  nowOn: 'Message notifications on',
  nowOff: 'Message notifications off',
  failed: 'Couldn’t update notifications.',
  blockedLabel: 'Alerts are blocked',
  blockedInBrowser: 'Alerts are blocked in your browser. Allow notifications for this site to turn them on.',
  blockedInSettingsTitle: 'Alerts are off',
  blockedInSettings: 'Allow notifications for Logbook in Settings to turn them on.',
  openSettings: 'Open Settings',
  notNow: 'Not now',
  needsInstall: 'Add Logbook to your home screen to get alerts.',
} as const;

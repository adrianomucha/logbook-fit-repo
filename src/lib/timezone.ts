/**
 * Timezone helpers.
 *
 * Timezones are stored as IANA identifiers ("Europe/Warsaw",
 * "America/New_York") on User.timezone — the standard representation that
 * keeps wall-clock semantics correct across DST transitions — and captured
 * from the browser via Intl.DateTimeFormat().resolvedOptions().timeZone
 * (see components/TimezoneSync.tsx).
 */

/** True when the string is an IANA timezone this runtime can resolve. */
export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Day of week (0 = Sunday … 6 = Saturday) at `date` in `timeZone`.
 * Falls back to UTC when the zone is missing or unresolvable — a corrupt
 * stored timezone must never break scheduling.
 */
export function weekdayInTimeZone(date: Date, timeZone: string | null | undefined): number {
  if (!timeZone) return date.getUTCDay();
  try {
    const name = new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "short",
    }).format(date);
    const index = WEEKDAYS.indexOf(name);
    return index === -1 ? date.getUTCDay() : index;
  } catch {
    return date.getUTCDay();
  }
}

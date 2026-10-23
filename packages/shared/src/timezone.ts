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

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The zone's wall-clock reading at `date`, written as if it were UTC
 * (Warsaw at 10:00Z in summer reads 12:00, so 12:00Z comes back). UTC when
 * the zone is missing or unresolvable.
 */
function wallClockMs(date: Date, timeZone: string | null | undefined): number {
  if (!timeZone) return date.getTime();
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    }).formatToParts(date);
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
    const ms = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
    return Number.isNaN(ms) ? date.getTime() : ms + date.getUTCMilliseconds();
  } catch {
    return date.getTime();
  }
}

/**
 * The calendar date of `date` in `timeZone`, as whole days since 1970-01-01.
 * Two instants on the same local day get the same number, so day and week
 * arithmetic happens on the person's calendar rather than the server's.
 */
export function localDayNumber(date: Date, timeZone: string | null | undefined): number {
  return Math.floor(wallClockMs(date, timeZone) / DAY_MS);
}

/** "2026-10-26" for a day number from localDayNumber. */
export function dayNumberToDateKey(dayNumber: number): string {
  return new Date(dayNumber * DAY_MS).toISOString().slice(0, 10);
}

/** The day number of a "2026-10-26" date key. */
export function dateKeyToDayNumber(dateKey: string): number {
  return Math.floor(Date.parse(`${dateKey}T00:00:00Z`) / DAY_MS);
}

/** Monday (as a day number) of the week holding `dayNumber`. 1970-01-01 was a Thursday. */
export function mondayOf(dayNumber: number): number {
  return dayNumber - ((((dayNumber + 3) % 7) + 7) % 7);
}

/**
 * The instant to store for a calendar date so it lands in that date's
 * Monday-to-Sunday week in every timezone (UTC-12 to UTC+14): 12:00 UTC,
 * except a Sunday at 00:00 UTC (noon would already be next Monday east of
 * UTC+12). Plan starts are stored this way, so whatever timezone the client
 * turns out to be in, or moves to, their plan weeks stay where the coach
 * put them.
 */
export function calendarDayInstant(dayNumber: number): Date {
  const isSunday = dayNumber - mondayOf(dayNumber) === 6;
  return new Date(dayNumber * DAY_MS + (isSunday ? 0 : DAY_MS / 2));
}

/**
 * The calendar date of an instant made by calendarDayInstant, read back the
 * same in every timezone; null for any other instant (a legacy start stored
 * as the moment of assignment).
 */
export function calendarDayOfInstant(date: Date): number | null {
  const ms = date.getTime();
  const dayNumber = Math.floor(ms / DAY_MS);
  return calendarDayInstant(dayNumber).getTime() === ms ? dayNumber : null;
}

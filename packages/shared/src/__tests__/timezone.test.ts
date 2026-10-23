import { describe, it, expect } from "vitest";

import {
  calendarDayInstant,
  calendarDayOfInstant,
  dateKeyToDayNumber,
  dayNumberToDateKey,
  isValidTimeZone,
  localDayNumber,
  mondayOf,
  weekdayInTimeZone,
} from "../timezone";

// 09:00 UTC on a Friday
const FRIDAY_MORNING_UTC = new Date("2026-08-07T09:00:00Z");

describe("isValidTimeZone", () => {
  it("accepts real IANA identifiers", () => {
    expect(isValidTimeZone("UTC")).toBe(true);
    expect(isValidTimeZone("Europe/Warsaw")).toBe(true);
    expect(isValidTimeZone("America/New_York")).toBe(true);
    expect(isValidTimeZone("Pacific/Auckland")).toBe(true);
  });

  it("rejects garbage", () => {
    expect(isValidTimeZone("Not/AZone")).toBe(false);
    expect(isValidTimeZone("")).toBe(false);
    expect(isValidTimeZone("GMT+25")).toBe(false);
  });
});

describe("weekdayInTimeZone", () => {
  it("matches getUTCDay for UTC", () => {
    expect(weekdayInTimeZone(FRIDAY_MORNING_UTC, "UTC")).toBe(5);
  });

  it("crosses the date line correctly", () => {
    // 09:00 UTC Friday is 23:00 Thursday in Honolulu (UTC-10, no DST)
    expect(weekdayInTimeZone(FRIDAY_MORNING_UTC, "Pacific/Honolulu")).toBe(4);
    // …and 21:00 Friday in Auckland (UTC+12 in August)
    expect(weekdayInTimeZone(FRIDAY_MORNING_UTC, "Pacific/Auckland")).toBe(5);
    // 23:00 UTC Friday is already Saturday in Auckland
    expect(
      weekdayInTimeZone(new Date("2026-08-07T23:00:00Z"), "Pacific/Auckland")
    ).toBe(6);
  });

  it("falls back to UTC for missing or invalid zones", () => {
    expect(weekdayInTimeZone(FRIDAY_MORNING_UTC, null)).toBe(5);
    expect(weekdayInTimeZone(FRIDAY_MORNING_UTC, undefined)).toBe(5);
    expect(weekdayInTimeZone(FRIDAY_MORNING_UTC, "Not/AZone")).toBe(5);
  });
});

describe('calendar days in a timezone', () => {
  const key = (date: Date, tz: string | null) => dayNumberToDateKey(localDayNumber(date, tz));

  it("puts an instant on the zone's own calendar day", () => {
    const instant = new Date('2026-10-12T01:00:00Z');
    expect(key(instant, 'UTC')).toBe('2026-10-12');
    expect(key(instant, 'America/Los_Angeles')).toBe('2026-10-11');
    expect(key(instant, 'Pacific/Kiritimati')).toBe('2026-10-12');
    expect(key(instant, null)).toBe('2026-10-12');
    expect(key(instant, 'Not/AZone')).toBe('2026-10-12');
  });

  it('finds the Monday of any day', () => {
    expect(dayNumberToDateKey(mondayOf(dateKeyToDayNumber('2026-10-25')))).toBe('2026-10-19'); // Sunday
    expect(dayNumberToDateKey(mondayOf(dateKeyToDayNumber('2026-10-26')))).toBe('2026-10-26'); // Monday
    expect(dayNumberToDateKey(mondayOf(dateKeyToDayNumber('1969-12-31')))).toBe('1969-12-29');
  });
});

describe('calendarDayInstant', () => {
  const zones = ['Etc/GMT+12', 'Pacific/Pago_Pago', 'America/Los_Angeles', 'UTC', 'Europe/Warsaw', 'Asia/Kolkata', 'Pacific/Auckland', 'Pacific/Kiritimati'];

  it("lands in the date's own Monday-to-Sunday week in every timezone, every weekday", () => {
    for (let d = dateKeyToDayNumber('2026-10-26'); d < dateKeyToDayNumber('2026-11-02'); d++) {
      const instant = calendarDayInstant(d);
      for (const tz of zones) {
        expect(mondayOf(localDayNumber(instant, tz)), `${dayNumberToDateKey(d)} in ${tz}`).toBe(mondayOf(d));
      }
    }
  });

  it('reads the date back, and nothing for an ordinary instant', () => {
    const sunday = dateKeyToDayNumber('2026-11-01');
    const monday = dateKeyToDayNumber('2026-10-26');
    expect(calendarDayOfInstant(calendarDayInstant(sunday))).toBe(sunday);
    expect(calendarDayOfInstant(calendarDayInstant(monday))).toBe(monday);
    expect(calendarDayOfInstant(new Date('2026-10-26T06:13:22Z'))).toBeNull();
  });
});

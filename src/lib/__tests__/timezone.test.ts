import { describe, it, expect } from "vitest";

import { isValidTimeZone, weekdayInTimeZone } from "../timezone";

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

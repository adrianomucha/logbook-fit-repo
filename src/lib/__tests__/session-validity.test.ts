import { describe, it, expect } from "vitest";
import { nowEpochSeconds, revokeSessionsAt, sessionStillValid } from "../session-validity";

describe("sessionStillValid", () => {
  const cutoff = new Date(Date.UTC(2026, 10, 6, 12, 0, 0));
  const cutoffSec = cutoff.getTime() / 1000;

  it("accepts everything when the account has no cutoff", () => {
    expect(sessionStillValid(undefined, null)).toBe(true);
    expect(sessionStillValid(1, undefined)).toBe(true);
  });

  it("refuses logins from before the cutoff", () => {
    expect(sessionStillValid(cutoffSec - 1, cutoff)).toBe(false);
  });

  it("refuses logins that predate the authTime claim once a cutoff exists", () => {
    expect(sessionStillValid(undefined, cutoff)).toBe(false);
  });

  it("accepts logins from the cutoff second onward", () => {
    expect(sessionStillValid(cutoffSec, cutoff)).toBe(true);
    expect(sessionStillValid(cutoffSec + 60, cutoff)).toBe(true);
  });

  it("keeps the re-issued login valid against a cutoff taken at the same moment", () => {
    const now = cutoff.getTime() + 999; // mid-second
    expect(sessionStillValid(nowEpochSeconds(now), revokeSessionsAt(now))).toBe(true);
  });
});

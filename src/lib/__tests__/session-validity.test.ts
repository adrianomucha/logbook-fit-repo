import { describe, it, expect } from "vitest";
import { sessionStillValid } from "../session-validity";

describe("sessionStillValid", () => {
  it("accepts a login at the account's current version", () => {
    expect(sessionStillValid(0, 0)).toBe(true);
    expect(sessionStillValid(3, 3)).toBe(true);
  });

  it("refuses a login issued before the latest password change", () => {
    expect(sessionStillValid(2, 3)).toBe(false);
  });

  it("treats tokens from before the claim as version 0", () => {
    expect(sessionStillValid(undefined, 0)).toBe(true);
    expect(sessionStillValid(undefined, 1)).toBe(false);
  });
});

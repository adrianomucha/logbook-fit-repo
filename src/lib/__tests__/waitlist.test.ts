import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  isCoachSignupOpen,
  appBaseUrl,
  waitlistInvitePath,
  setupCallBookingUrl,
  withBookingPrefill,
} from "../waitlist";

const ENV_KEYS = [
  "OPEN_COACH_SIGNUP",
  "SETUP_CALL_BOOKING_URL",
  "NEXTAUTH_URL",
  "VERCEL_PROJECT_PRODUCTION_URL",
  "VERCEL_URL",
] as const;
let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  for (const key of ENV_KEYS) delete process.env[key];
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

describe("isCoachSignupOpen", () => {
  it("is closed by default — the beta is invite-only", () => {
    expect(isCoachSignupOpen()).toBe(false);
  });

  it("opens only on the exact string 'true'", () => {
    process.env.OPEN_COACH_SIGNUP = "true";
    expect(isCoachSignupOpen()).toBe(true);
  });

  it("stays closed for truthy-looking values", () => {
    for (const value of ["1", "TRUE", "yes", "on", ""]) {
      process.env.OPEN_COACH_SIGNUP = value;
      expect(isCoachSignupOpen()).toBe(false);
    }
  });
});

describe("appBaseUrl", () => {
  it("prefers NEXTAUTH_URL and strips trailing slashes", () => {
    process.env.NEXTAUTH_URL = "https://logbook.fit/";
    process.env.VERCEL_URL = "deploy-abc.vercel.app";
    expect(appBaseUrl()).toBe("https://logbook.fit");
  });

  it("falls back to the Vercel production domain, then the deploy URL", () => {
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "logbook.fit";
    process.env.VERCEL_URL = "deploy-abc.vercel.app";
    expect(appBaseUrl()).toBe("https://logbook.fit");

    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    expect(appBaseUrl()).toBe("https://deploy-abc.vercel.app");
  });

  it("defaults to localhost for bare dev environments", () => {
    expect(appBaseUrl()).toBe("http://localhost:3000");
  });
});

describe("waitlistInvitePath", () => {
  it("builds the beta signup path", () => {
    expect(waitlistInvitePath("abc123")).toBe("/signup?beta=abc123");
  });

  it("URL-encodes the token", () => {
    expect(waitlistInvitePath("a+b/c=")).toBe("/signup?beta=a%2Bb%2Fc%3D");
  });
});

describe("setupCallBookingUrl", () => {
  it("is null when unset", () => {
    expect(setupCallBookingUrl()).toBeNull();
  });

  it("returns a valid https URL", () => {
    process.env.SETUP_CALL_BOOKING_URL = " https://calendly.com/adrian/logbook-setup ";
    expect(setupCallBookingUrl()).toBe("https://calendly.com/adrian/logbook-setup");
  });

  it("rejects non-https and malformed values", () => {
    for (const bad of ["http://calendly.com/adrian", "calendly.com/adrian", "not a url", ""]) {
      process.env.SETUP_CALL_BOOKING_URL = bad;
      expect(setupCallBookingUrl(), `should reject: ${bad}`).toBeNull();
    }
  });
});

describe("withBookingPrefill", () => {
  const base = "https://calendly.com/adrian/logbook-setup";

  it("adds name and email for Calendly links", () => {
    expect(withBookingPrefill(base, { email: "coach@example.com", name: "Sam Lee" })).toBe(
      `${base}?email=coach%40example.com&name=Sam+Lee`
    );
  });

  it("keeps existing query params and skips blank values", () => {
    expect(withBookingPrefill(`${base}?month=2026-09`, { email: "  ", name: null })).toBe(
      `${base}?month=2026-09`
    );
    expect(withBookingPrefill(`${base}?month=2026-09`, { email: "a@b.co" })).toBe(
      `${base}?month=2026-09&email=a%40b.co`
    );
  });

  it("leaves non-Calendly schedulers untouched", () => {
    const other = "https://cal.com/adrian/setup";
    expect(withBookingPrefill(other, { email: "a@b.co", name: "Sam" })).toBe(other);
  });

  it("returns an unparseable URL as-is", () => {
    expect(withBookingPrefill("nope", { email: "a@b.co" })).toBe("nope");
  });
});

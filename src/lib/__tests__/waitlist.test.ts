import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isCoachSignupOpen, appBaseUrl, waitlistInvitePath } from "../waitlist";

const ENV_KEYS = [
  "OPEN_COACH_SIGNUP",
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

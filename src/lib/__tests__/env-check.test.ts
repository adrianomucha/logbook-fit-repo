import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { envProblems } from "@/lib/env-check";

/**
 * envProblems() folds in emailConfigStatus(), which reads process.env
 * directly — so every case stubs the full set of relevant vars rather than
 * passing a partial env object.
 */

const FULLY_CONFIGURED = {
  RESEND_API_KEY: "re_test_key",
  WAITLIST_FROM_EMAIL: "Logbook.fit <hello@logbook.fit>",
  ADMIN_EMAILS: "owner@logbook.fit",
  UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
  UPSTASH_REDIS_REST_TOKEN: "token",
  NEXTAUTH_URL: "https://logbook.fit",
  CRON_SECRET: "cron-secret",
} as const;

function stubEnv(overrides: Record<string, string | undefined>) {
  const env = { ...FULLY_CONFIGURED, ...overrides };
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) {
      vi.stubEnv(key, "");
      delete process.env[key];
    } else {
      vi.stubEnv(key, value);
    }
  }
}

describe("envProblems", () => {
  beforeEach(() => {
    stubEnv({});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns no problems when everything is configured", () => {
    expect(envProblems(process.env)).toEqual([]);
  });

  it("flags a missing mailer", () => {
    stubEnv({ RESEND_API_KEY: undefined });
    const problems = envProblems(process.env);
    expect(problems.some((p) => p.includes("RESEND_API_KEY"))).toBe(true);
  });

  it("flags a malformed sender address", () => {
    stubEnv({ WAITLIST_FROM_EMAIL: "Logbook <a@x.com, b@x.com>" });
    const problems = envProblems(process.env);
    expect(problems.some((p) => p.includes("WAITLIST_FROM_EMAIL"))).toBe(true);
  });

  it("flags an empty admin allowlist", () => {
    stubEnv({ ADMIN_EMAILS: undefined });
    const problems = envProblems(process.env);
    expect(problems.some((p) => p.includes("ADMIN_EMAILS"))).toBe(true);
  });

  it("treats a comma-only ADMIN_EMAILS as empty", () => {
    stubEnv({ ADMIN_EMAILS: " , ," });
    const problems = envProblems(process.env);
    expect(problems.some((p) => p.includes("ADMIN_EMAILS"))).toBe(true);
  });

  it("flags missing Upstash config", () => {
    stubEnv({
      UPSTASH_REDIS_REST_URL: undefined,
      UPSTASH_REDIS_REST_TOKEN: undefined,
    });
    const problems = envProblems(process.env);
    expect(problems.some((p) => p.includes("Upstash"))).toBe(true);
  });

  it("accepts the Vercel Marketplace KV_ names in place of UPSTASH_", () => {
    stubEnv({
      UPSTASH_REDIS_REST_URL: undefined,
      UPSTASH_REDIS_REST_TOKEN: undefined,
      KV_REST_API_URL: "https://example.upstash.io",
      KV_REST_API_TOKEN: "token",
    });
    const problems = envProblems(process.env);
    expect(problems.some((p) => p.includes("Upstash"))).toBe(false);
  });

  it("flags a URL without a token as unconfigured", () => {
    stubEnv({ UPSTASH_REDIS_REST_TOKEN: undefined });
    const problems = envProblems(process.env);
    expect(problems.some((p) => p.includes("Upstash"))).toBe(true);
  });

  it("flags a missing NEXTAUTH_URL", () => {
    stubEnv({ NEXTAUTH_URL: undefined });
    const problems = envProblems(process.env);
    expect(problems.some((p) => p.includes("NEXTAUTH_URL"))).toBe(true);
  });

  it("flags a missing CRON_SECRET", () => {
    stubEnv({ CRON_SECRET: undefined });
    const problems = envProblems(process.env);
    expect(problems.some((p) => p.includes("CRON_SECRET"))).toBe(true);
  });

  it("reports every problem at once", () => {
    stubEnv({
      RESEND_API_KEY: undefined,
      ADMIN_EMAILS: undefined,
      UPSTASH_REDIS_REST_URL: undefined,
      UPSTASH_REDIS_REST_TOKEN: undefined,
      NEXTAUTH_URL: undefined,
      CRON_SECRET: undefined,
    });
    expect(envProblems(process.env)).toHaveLength(5);
  });
});

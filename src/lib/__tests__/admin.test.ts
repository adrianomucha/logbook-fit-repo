import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { bearerToken, isAdminEmail, isValidAdminToken } from "../admin";

const ENV_KEYS = [
  "ADMIN_EMAILS",
  "WAITLIST_ADMIN_TOKEN",
  "WAITLIST_ADMIN_TOKEN_PREVIOUS",
] as const;
let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

describe("isValidAdminToken", () => {
  it("accepts the exact configured token", () => {
    process.env.WAITLIST_ADMIN_TOKEN = "s3cret-token";
    expect(isValidAdminToken("s3cret-token")).toBe(true);
  });

  it("rejects a wrong token", () => {
    process.env.WAITLIST_ADMIN_TOKEN = "s3cret-token";
    expect(isValidAdminToken("wrong")).toBe(false);
  });

  it("rejects tokens of a different length", () => {
    process.env.WAITLIST_ADMIN_TOKEN = "s3cret-token";
    expect(isValidAdminToken("s3cret-token-longer")).toBe(false);
    expect(isValidAdminToken("s3c")).toBe(false);
  });

  it("rejects everything when no env var is set", () => {
    delete process.env.WAITLIST_ADMIN_TOKEN;
    delete process.env.WAITLIST_ADMIN_TOKEN_PREVIOUS;
    expect(isValidAdminToken("")).toBe(false);
    expect(isValidAdminToken(null)).toBe(false);
    expect(isValidAdminToken(undefined)).toBe(false);
    expect(isValidAdminToken("anything")).toBe(false);
  });

  it("accepts both current and previous token during rotation", () => {
    process.env.WAITLIST_ADMIN_TOKEN = "new-token";
    process.env.WAITLIST_ADMIN_TOKEN_PREVIOUS = "old-token";
    expect(isValidAdminToken("new-token")).toBe(true);
    expect(isValidAdminToken("old-token")).toBe(true);
    expect(isValidAdminToken("wrong")).toBe(false);
  });

  it("rejects the previous token once _PREVIOUS is unset", () => {
    process.env.WAITLIST_ADMIN_TOKEN = "new-token";
    delete process.env.WAITLIST_ADMIN_TOKEN_PREVIOUS;
    expect(isValidAdminToken("old-token")).toBe(false);
    expect(isValidAdminToken("new-token")).toBe(true);
  });

  it("cannot be unlocked by _PREVIOUS alone matching empty current", () => {
    delete process.env.WAITLIST_ADMIN_TOKEN;
    process.env.WAITLIST_ADMIN_TOKEN_PREVIOUS = "old-token";
    expect(isValidAdminToken("old-token")).toBe(true);
    expect(isValidAdminToken("")).toBe(false);
    expect(isValidAdminToken("anything-else")).toBe(false);
  });

  it("rejects empty/null even when the env var is set", () => {
    process.env.WAITLIST_ADMIN_TOKEN = "s3cret-token";
    expect(isValidAdminToken("")).toBe(false);
    expect(isValidAdminToken(null)).toBe(false);
    expect(isValidAdminToken(undefined)).toBe(false);
  });
});

describe("bearerToken", () => {
  const reqWithAuth = (value?: string) =>
    new Request("http://test.local", {
      headers: value ? { authorization: value } : {},
    });

  it("extracts the token from a Bearer header, case-insensitively", () => {
    expect(bearerToken(reqWithAuth("Bearer abc123"))).toBe("abc123");
    expect(bearerToken(reqWithAuth("bearer abc123"))).toBe("abc123");
  });

  it("returns null without a header or for other schemes", () => {
    expect(bearerToken(reqWithAuth())).toBeNull();
    expect(bearerToken(reqWithAuth("Basic dXNlcjpwYXNz"))).toBeNull();
    expect(bearerToken(reqWithAuth("Bearer"))).toBeNull();
  });
});

describe("isAdminEmail", () => {
  it("matches allowlisted emails case-insensitively", () => {
    process.env.ADMIN_EMAILS = "Owner@Example.com, second@example.com";
    expect(isAdminEmail("owner@example.com")).toBe(true);
    expect(isAdminEmail("SECOND@EXAMPLE.COM")).toBe(true);
  });

  it("rejects emails not on the allowlist", () => {
    process.env.ADMIN_EMAILS = "owner@example.com";
    expect(isAdminEmail("intruder@example.com")).toBe(false);
  });

  it("rejects everything when the allowlist is unset or empty", () => {
    delete process.env.ADMIN_EMAILS;
    expect(isAdminEmail("owner@example.com")).toBe(false);
    process.env.ADMIN_EMAILS = "";
    expect(isAdminEmail("")).toBe(false);
    expect(isAdminEmail(null)).toBe(false);
  });
});

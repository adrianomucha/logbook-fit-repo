import { describe, it, expect, afterEach, vi } from "vitest";
import { isDemoModeEnabled, isDemoAccount, isLockedDemoAccount } from "../demo";

// NODE_ENV is typed readonly by Next, so use vi.stubEnv instead of assigning.
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("isDemoModeEnabled", () => {
  it("is on when NEXT_PUBLIC_DEMO_MODE=true, even in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "true");
    expect(isDemoModeEnabled()).toBe(true);
  });

  it("is off when NEXT_PUBLIC_DEMO_MODE=false, even in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "false");
    expect(isDemoModeEnabled()).toBe(false);
  });

  it("defaults to on only in development when unset", () => {
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "");
    vi.stubEnv("NODE_ENV", "development");
    expect(isDemoModeEnabled()).toBe(true);
    vi.stubEnv("NODE_ENV", "production");
    expect(isDemoModeEnabled()).toBe(false);
    vi.stubEnv("NODE_ENV", "test");
    expect(isDemoModeEnabled()).toBe(false);
  });

  it("treats any value other than exactly 'true' as not an opt-in", () => {
    vi.stubEnv("NODE_ENV", "production");
    for (const value of ["TRUE", "1", "yes", "on"]) {
      vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", value);
      expect(isDemoModeEnabled()).toBe(false);
    }
  });
});

describe("isDemoAccount", () => {
  it("matches the login-page demo accounts, case/whitespace-insensitively", () => {
    expect(isDemoAccount("coach@logbook.fit")).toBe(true);
    expect(isDemoAccount("client@logbook.fit")).toBe(true);
    expect(isDemoAccount("  Coach@Logbook.FIT ")).toBe(true);
  });

  it("matches the seeded demo clients", () => {
    expect(isDemoAccount("emma@demo.logbook.fit")).toBe(true);
    expect(isDemoAccount("alex@demo.logbook.fit")).toBe(true);
    expect(isDemoAccount("jordan@demo.logbook.fit")).toBe(true);
  });

  it("rejects real accounts, lookalikes, and empty input", () => {
    expect(isDemoAccount("someone@example.com")).toBe(false);
    expect(isDemoAccount("notcoach@logbook.fit")).toBe(false);
    expect(isDemoAccount("emma@notdemo.logbook.fit")).toBe(false);
    expect(isDemoAccount("")).toBe(false);
    expect(isDemoAccount(null)).toBe(false);
    expect(isDemoAccount(undefined)).toBe(false);
  });

  // A real test account was created at piyumika@demo.logbook.fit; matching the
  // subdomain rather than the account made it undeployable — sign-in was
  // refused before the password check, which reads as "wrong password".
  it("does not claim real accounts that merely share the demo subdomain", () => {
    expect(isDemoAccount("piyumika@demo.logbook.fit")).toBe(false);
    expect(isDemoAccount("someone-else@demo.logbook.fit")).toBe(false);
  });
});

describe("isLockedDemoAccount", () => {
  it("locks demo accounts exactly when demo mode is off", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "");
    expect(isLockedDemoAccount("coach@logbook.fit")).toBe(true);
    expect(isLockedDemoAccount("emma@demo.logbook.fit")).toBe(true);

    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "true");
    expect(isLockedDemoAccount("coach@logbook.fit")).toBe(false);
  });

  it("never locks non-demo accounts", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "");
    expect(isLockedDemoAccount("someone@example.com")).toBe(false);
    expect(isLockedDemoAccount("piyumika@demo.logbook.fit")).toBe(false);
    expect(isLockedDemoAccount(null)).toBe(false);
  });
});

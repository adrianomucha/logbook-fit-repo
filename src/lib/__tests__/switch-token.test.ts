import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createSwitchToken, verifySwitchToken } from "../switch-token";

let savedSecret: string | undefined;

beforeEach(() => {
  savedSecret = process.env.NEXTAUTH_SECRET;
  process.env.NEXTAUTH_SECRET = "test-secret";
});

afterEach(() => {
  if (savedSecret === undefined) delete process.env.NEXTAUTH_SECRET;
  else process.env.NEXTAUTH_SECRET = savedSecret;
});

const UID = "6f9619ff-8b86-4d01-b42d-00cf4fc964ff";

describe("switch tokens", () => {
  it("round-trips a user id", () => {
    const token = createSwitchToken(UID);
    expect(token).toBeTruthy();
    expect(verifySwitchToken(token)).toBe(UID);
  });

  it("expires after 60 seconds", () => {
    const now = 1_700_000_000_000;
    const token = createSwitchToken(UID, now)!;
    expect(verifySwitchToken(token, now + 59_000)).toBe(UID);
    expect(verifySwitchToken(token, now + 61_000)).toBeNull();
  });

  it("rejects a tampered payload", () => {
    const token = createSwitchToken(UID)!;
    const [payload, mac] = token.split(".");
    const otherPayload = Buffer.from(
      JSON.stringify({ aud: "account-switch", uid: "attacker", exp: Date.now() + 60_000 })
    ).toString("base64url");
    expect(verifySwitchToken(`${otherPayload}.${mac}`)).toBeNull();
    expect(verifySwitchToken(`${payload}.${mac.slice(0, -2)}xx`)).toBeNull();
  });

  it("rejects tokens signed with a different secret", () => {
    const token = createSwitchToken(UID)!;
    process.env.NEXTAUTH_SECRET = "rotated-secret";
    expect(verifySwitchToken(token)).toBeNull();
  });

  it("rejects garbage shapes", () => {
    expect(verifySwitchToken(null)).toBeNull();
    expect(verifySwitchToken(undefined)).toBeNull();
    expect(verifySwitchToken("")).toBeNull();
    expect(verifySwitchToken("no-dot")).toBeNull();
    expect(verifySwitchToken("a.b.c")).toBeNull();
    expect(verifySwitchToken("!!!.???")).toBeNull();
  });

  it("does nothing without NEXTAUTH_SECRET", () => {
    const token = createSwitchToken(UID)!;
    delete process.env.NEXTAUTH_SECRET;
    expect(createSwitchToken(UID)).toBeNull();
    expect(verifySwitchToken(token)).toBeNull();
  });

  it("refuses an empty user id", () => {
    expect(createSwitchToken("")).toBeNull();
  });
});

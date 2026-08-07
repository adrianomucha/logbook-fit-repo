import crypto from "crypto";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createResetToken,
  verifyResetToken,
  passwordFingerprint,
} from "../reset-token";

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
const HASH = "$2a$10$abcdefghijklmnopqrstuvwx.yz0123456789ABCDEFGHIJKLMNOPQ";

describe("reset tokens", () => {
  it("round-trips the user id and password fingerprint", () => {
    const token = createResetToken(UID, HASH);
    expect(token).toBeTruthy();
    const verified = verifyResetToken(token);
    expect(verified?.userId).toBe(UID);
    expect(verified?.fingerprint).toBe(passwordFingerprint(HASH));
  });

  it("expires after 30 minutes", () => {
    const now = 1_700_000_000_000;
    const token = createResetToken(UID, HASH, now)!;
    expect(verifyResetToken(token, now + 29 * 60_000)?.userId).toBe(UID);
    expect(verifyResetToken(token, now + 31 * 60_000)).toBeNull();
  });

  it("fingerprint no longer matches once the password hash changes", () => {
    // This mismatch is the single-use mechanism — the confirm endpoint
    // compares the verified fingerprint against the current hash's.
    const token = createResetToken(UID, HASH)!;
    const verified = verifyResetToken(token)!;
    expect(verified.fingerprint).not.toBe(
      passwordFingerprint("$2a$10$completely-different-hash-after-the-reset")
    );
  });

  it("fingerprints reveal nothing recoverable and are stable", () => {
    expect(passwordFingerprint(HASH)).toBe(passwordFingerprint(HASH));
    expect(passwordFingerprint(HASH)).toHaveLength(16);
    expect(passwordFingerprint(HASH)).not.toContain(HASH.slice(0, 8));
  });

  it("rejects a tampered payload", () => {
    const token = createResetToken(UID, HASH)!;
    const [payload, mac] = token.split(".");
    const otherPayload = Buffer.from(
      JSON.stringify({
        aud: "password-reset",
        uid: "attacker",
        pwf: passwordFingerprint(HASH),
        exp: Date.now() + 60_000,
      })
    ).toString("base64url");
    expect(verifyResetToken(`${otherPayload}.${mac}`)).toBeNull();
    expect(verifyResetToken(`${payload}.${mac.slice(0, -2)}xx`)).toBeNull();
  });

  it("rejects an account-switch token (wrong audience)", () => {
    // Same secret signs both token families — the audience is what keeps a
    // 60s switch token from doubling as a 30min reset token.
    const payload = Buffer.from(
      JSON.stringify({ aud: "account-switch", uid: UID, exp: Date.now() + 60_000 })
    ).toString("base64url");
    const mac = crypto
      .createHmac("sha256", "test-secret")
      .update(payload)
      .digest("base64url");
    expect(verifyResetToken(`${payload}.${mac}`)).toBeNull();
  });

  it("rejects tokens signed with a different secret", () => {
    const token = createResetToken(UID, HASH)!;
    process.env.NEXTAUTH_SECRET = "rotated-secret";
    expect(verifyResetToken(token)).toBeNull();
  });

  it("rejects garbage shapes", () => {
    expect(verifyResetToken(null)).toBeNull();
    expect(verifyResetToken(undefined)).toBeNull();
    expect(verifyResetToken("")).toBeNull();
    expect(verifyResetToken("no-dot")).toBeNull();
    expect(verifyResetToken("a.b.c")).toBeNull();
    expect(verifyResetToken("!!!.???")).toBeNull();
  });

  it("does nothing without NEXTAUTH_SECRET", () => {
    const token = createResetToken(UID, HASH)!;
    delete process.env.NEXTAUTH_SECRET;
    expect(createResetToken(UID, HASH)).toBeNull();
    expect(verifyResetToken(token)).toBeNull();
  });

  it("refuses empty inputs", () => {
    expect(createResetToken("", HASH)).toBeNull();
    expect(createResetToken(UID, "")).toBeNull();
  });
});

import { describe, it, expect } from "vitest";
import { generateSecureToken } from "../tokens";

describe("generateSecureToken", () => {
  it("returns a non-empty string", () => {
    const token = generateSecureToken();
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);
  });

  it("returns 43-character base64url string for 32 bytes (default)", () => {
    // 32 bytes → ceil(32 * 4/3) = 43 chars in base64url (no padding)
    const token = generateSecureToken();
    expect(token.length).toBe(43);
  });

  it("generates unique tokens on each call", () => {
    const tokens = new Set(Array.from({ length: 100 }, () => generateSecureToken()));
    expect(tokens.size).toBe(100);
  });

  it("produces URL-safe characters only", () => {
    const token = generateSecureToken();
    // base64url: A-Z, a-z, 0-9, -, _
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("respects custom byte length", () => {
    const token16 = generateSecureToken(16);
    const token64 = generateSecureToken(64);
    // 16 bytes → 22 chars, 64 bytes → 86 chars
    expect(token16.length).toBe(22);
    expect(token64.length).toBe(86);
  });

  it("is not a UUID format", () => {
    const token = generateSecureToken();
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    expect(token).not.toMatch(uuidRegex);
  });
});

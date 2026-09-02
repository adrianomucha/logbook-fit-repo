import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { encode } from "next-auth/jwt";
import {
  bearerFromAuthorization,
  createMobileToken,
  readMobileToken,
  MOBILE_TOKEN_MAX_AGE_SEC,
} from "../mobile-token";

let savedSecret: string | undefined;

beforeEach(() => {
  savedSecret = process.env.NEXTAUTH_SECRET;
  process.env.NEXTAUTH_SECRET = "test-secret";
});

afterEach(() => {
  if (savedSecret === undefined) delete process.env.NEXTAUTH_SECRET;
  else process.env.NEXTAUTH_SECRET = savedSecret;
});

const USER = {
  id: "6f9619ff-8b86-4d01-b42d-00cf4fc964ff",
  email: "client@example.com",
  name: "Sam Client",
  role: "CLIENT",
};

describe("mobile tokens", () => {
  it("round-trips the user", async () => {
    const minted = await createMobileToken(USER);
    expect(minted).not.toBeNull();
    const claims = await readMobileToken(minted!.token);
    expect(claims).toMatchObject(USER);
  });

  it("lives 30 days, like the web session", async () => {
    const now = 1_700_000_000_000;
    const minted = (await createMobileToken(USER, now))!;
    expect(minted.expiresAt.getTime()).toBe(now + MOBILE_TOKEN_MAX_AGE_SEC * 1000);
    const claims = (await readMobileToken(minted.token))!;
    // Claim is stamped by next-auth from the real clock; allow a little drift
    const expected = Math.floor(Date.now() / 1000) + MOBILE_TOKEN_MAX_AGE_SEC;
    expect(Math.abs(claims.expiresAt - expected)).toBeLessThan(5);
  });

  it("rejects an expired token", async () => {
    const token = await encode({
      secret: "test-secret",
      maxAge: -60, // already past, beyond next-auth's 15s tolerance
      token: { userId: USER.id, role: USER.role },
    });
    expect(await readMobileToken(token)).toBeNull();
  });

  it("rejects a token encrypted with a different secret", async () => {
    const minted = (await createMobileToken(USER))!;
    process.env.NEXTAUTH_SECRET = "rotated-secret";
    expect(await readMobileToken(minted.token)).toBeNull();
  });

  it("rejects a token missing the claims routes rely on", async () => {
    const noRole = await encode({
      secret: "test-secret",
      token: { userId: USER.id },
    });
    expect(await readMobileToken(noRole)).toBeNull();
    const noUser = await encode({
      secret: "test-secret",
      token: { role: "CLIENT" },
    });
    expect(await readMobileToken(noUser)).toBeNull();
  });

  it("rejects garbage and refuses to mint without a secret", async () => {
    expect(await readMobileToken(null)).toBeNull();
    expect(await readMobileToken("")).toBeNull();
    expect(await readMobileToken("not.a.jwe")).toBeNull();
    delete process.env.NEXTAUTH_SECRET;
    expect(await createMobileToken(USER)).toBeNull();
    expect(await readMobileToken("anything")).toBeNull();
  });
});

describe("bearerFromAuthorization", () => {
  it("extracts the token, case-insensitively", () => {
    expect(bearerFromAuthorization("Bearer abc.def")).toBe("abc.def");
    expect(bearerFromAuthorization("bearer   abc")).toBe("abc");
  });

  it("returns null for anything that isn't a bearer credential", () => {
    expect(bearerFromAuthorization(null)).toBeNull();
    expect(bearerFromAuthorization("")).toBeNull();
    expect(bearerFromAuthorization("Basic abc")).toBeNull();
    expect(bearerFromAuthorization("Bearer ")).toBeNull();
    expect(bearerFromAuthorization("Bearer")).toBeNull();
  });
});

import { describe, it, expect, beforeAll } from "vitest";
import { SignJWT } from "jose";
import { signMobileToken, verifyMobileToken, MobileTokenPayload } from "../mobile-token";

const SECRET = "test-secret-for-mobile-token-suite";

const PAYLOAD: MobileTokenPayload = {
  userId: "user_123",
  email: "client@logbook.fit",
  role: "CLIENT",
};

beforeAll(() => {
  process.env.NEXTAUTH_SECRET = SECRET;
});

describe("signMobileToken / verifyMobileToken", () => {
  it("round-trips a payload", async () => {
    const token = await signMobileToken(PAYLOAD);
    expect(await verifyMobileToken(token)).toEqual(PAYLOAD);
  });

  it("produces a three-part JWT with sub set to the userId", async () => {
    const token = await signMobileToken(PAYLOAD);
    const [, body] = token.split(".");
    expect(token.split(".")).toHaveLength(3);
    const claims = JSON.parse(Buffer.from(body, "base64url").toString());
    expect(claims.sub).toBe(PAYLOAD.userId);
    expect(claims.exp - claims.iat).toBe(30 * 24 * 60 * 60); // 30 days
  });

  it("rejects a malformed token", async () => {
    expect(await verifyMobileToken("not-a-jwt")).toBeNull();
  });

  it("rejects a token signed with a different secret", async () => {
    const forged = await new SignJWT({ ...PAYLOAD })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("30d")
      .sign(new TextEncoder().encode("some-other-secret"));
    expect(await verifyMobileToken(forged)).toBeNull();
  });

  it("rejects an expired token", async () => {
    const expired = await new SignJWT({ ...PAYLOAD })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt(Math.floor(Date.now() / 1000) - 3600)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(new TextEncoder().encode(SECRET));
    expect(await verifyMobileToken(expired)).toBeNull();
  });

  it("rejects a validly signed token missing required claims", async () => {
    const incomplete = await new SignJWT({ userId: "user_123" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("30d")
      .sign(new TextEncoder().encode(SECRET));
    expect(await verifyMobileToken(incomplete)).toBeNull();
  });

  it("rejects a token using an unexpected algorithm", async () => {
    // alg: none-style downgrade — header says HS384, verify only allows HS256
    const wrongAlg = await new SignJWT({ ...PAYLOAD })
      .setProtectedHeader({ alg: "HS384" })
      .setIssuedAt()
      .setExpirationTime("30d")
      .sign(new TextEncoder().encode(SECRET));
    expect(await verifyMobileToken(wrongAlg)).toBeNull();
  });
});

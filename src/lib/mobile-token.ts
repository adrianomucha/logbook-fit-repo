import { SignJWT, jwtVerify } from "jose";

/**
 * Token helpers for the iOS client app (token-based auth).
 *
 * The web app authenticates with NextAuth cookie sessions. Native apps can't use
 * cookies cleanly, so the iOS app logs in once via POST /api/mobile/auth/login,
 * receives a signed JWT, stores it in the iOS Keychain (Expo SecureStore), and
 * sends it as `Authorization: Bearer <token>` on every request.
 *
 * These are plain HS256 JWTs signed with NEXTAUTH_SECRET — distinct from NextAuth's
 * encrypted cookie tokens. They never travel as cookies, so the two never collide.
 */

const ALG = "HS256";
const EXPIRY = "30d"; // matches the web NextAuth session maxAge

function getSecret(): Uint8Array {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET is not set — cannot sign/verify mobile tokens");
  }
  return new TextEncoder().encode(secret);
}

export type MobileTokenPayload = {
  userId: string;
  email: string;
  role: string;
};

/** Signs a 30-day mobile auth token. */
export async function signMobileToken(payload: MobileTokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: ALG })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(getSecret());
}

/**
 * Verifies a mobile auth token. Returns the payload, or null if the token is
 * missing required claims, expired, or has an invalid signature.
 */
export async function verifyMobileToken(token: string): Promise<MobileTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: [ALG] });
    const { userId, email, role } = payload as Record<string, unknown>;
    if (typeof userId === "string" && typeof email === "string" && typeof role === "string") {
      return { userId, email, role };
    }
    return null;
  } catch {
    return null;
  }
}

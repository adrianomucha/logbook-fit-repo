import { encode, decode } from "next-auth/jwt";

/**
 * Bearer tokens for the native app.
 *
 * The web app's session is a NextAuth JWT carried in a cookie. The iOS app
 * has no cookie jar worth trusting, so it carries the *same kind* of token
 * in an `Authorization: Bearer` header instead: encrypted with the same
 * `NEXTAUTH_SECRET`, carrying the same claims the `jwt` callback in
 * lib/auth.ts writes (`userId`, `role`, `email`, `name`), with the same
 * 30-day lifetime. One token format means one set of claims to keep in sync
 * and nothing new to rotate — and `getSession()` in lib/session.ts can hand
 * either kind of caller an identical `Session`.
 *
 * Minted only by POST /api/auth/mobile/login (after the shared credential
 * check) and /refresh (from a still-valid token). Stateless like the cookie:
 * there is no revocation list for either, and the account's `deletedAt` is
 * the kill switch for both.
 */

/** Same lifetime as the web session (lib/auth.ts). */
export const MOBILE_TOKEN_MAX_AGE_SEC = 30 * 24 * 60 * 60;

export interface MobileTokenUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface MobileTokenClaims extends MobileTokenUser {
  /** Epoch seconds. */
  expiresAt: number;
}

function secret(): string | null {
  return process.env.NEXTAUTH_SECRET ?? null;
}

/**
 * Mint a token for `user`. Returns null when NEXTAUTH_SECRET is unset
 * (never the case in a running deployment — next-auth requires it).
 */
export async function createMobileToken(
  user: MobileTokenUser,
  now = Date.now()
): Promise<{ token: string; expiresAt: Date } | null> {
  const key = secret();
  if (!key || !user.id) return null;

  const token = await encode({
    secret: key,
    maxAge: MOBILE_TOKEN_MAX_AGE_SEC,
    token: {
      sub: user.id,
      userId: user.id,
      role: user.role,
      email: user.email,
      name: user.name,
    },
  });
  return { token, expiresAt: new Date(now + MOBILE_TOKEN_MAX_AGE_SEC * 1000) };
}

/**
 * Verify a token and return its claims, or null for anything that isn't an
 * unexpired token encrypted with the current secret. Missing claims (a
 * token minted by something else) also fail — every consumer relies on
 * `id` and `role` being present.
 */
export async function readMobileToken(
  token: string | null | undefined
): Promise<MobileTokenClaims | null> {
  const key = secret();
  if (!key || !token) return null;

  let claims;
  try {
    claims = await decode({ token, secret: key });
  } catch {
    return null;
  }
  if (!claims) return null;

  const id = typeof claims.userId === "string" ? claims.userId : null;
  const role = typeof claims.role === "string" ? claims.role : null;
  const exp = typeof claims.exp === "number" ? claims.exp : null;
  if (!id || !role || !exp) return null;

  return {
    id,
    role,
    email: typeof claims.email === "string" ? claims.email : "",
    name: typeof claims.name === "string" ? claims.name : "",
    expiresAt: exp,
  };
}

/** The token from an `Authorization: Bearer …` header value, or null. */
export function bearerFromAuthorization(
  authorization: string | null | undefined
): string | null {
  if (!authorization) return null;
  const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
  return match ? match[1].trim() || null : null;
}

import { NextResponse } from "next/server";
import { encode } from "next-auth/jwt";
import {
  bearerFromAuthorization,
  createMobileToken,
  MOBILE_TOKEN_MAX_AGE_SEC,
  type MobileTokenUser,
} from "@/lib/mobile-token";

/**
 * After a password change revokes every login (session-validity.ts), keep
 * the device that made the change signed in by handing it a fresh one,
 * signed in at `authTime` (the same second as the new cutoff).
 *
 * The caller is answered in kind:
 * - a bearer caller (native app) gets `session` in the JSON body, the same
 *   shape as POST /api/auth/mobile/login, and stores it;
 * - a cookie caller (web) gets a re-minted NextAuth session cookie, under
 *   the same name it sent, with the same claims lib/auth.ts writes.
 *
 * Returns null when NEXTAUTH_SECRET is unset (never in a running deploy).
 */
export async function respondWithFreshLogin(
  req: Request,
  user: MobileTokenUser,
  authTime: number,
  body: Record<string, unknown>
): Promise<NextResponse | null> {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return null;

  if (bearerFromAuthorization(req.headers.get("authorization"))) {
    const minted = await createMobileToken(user, Date.now(), authTime);
    if (!minted) return null;
    return NextResponse.json({
      ...body,
      session: { token: minted.token, expiresAt: minted.expiresAt.toISOString(), user },
    });
  }

  const cookieName = sessionCookieName(req.headers.get("cookie"));
  const token = await encode({
    secret,
    maxAge: MOBILE_TOKEN_MAX_AGE_SEC,
    token: {
      sub: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      userId: user.id,
      authTime,
    },
  });
  const res = NextResponse.json(body);
  res.cookies.set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: cookieName.startsWith("__Secure-"),
    maxAge: MOBILE_TOKEN_MAX_AGE_SEC,
  });
  return res;
}

const SECURE_COOKIE = "__Secure-next-auth.session-token";
const PLAIN_COOKIE = "next-auth.session-token";

/** The NextAuth session cookie name this browser is using. */
export function sessionCookieName(cookieHeader: string | null): string {
  const names = (cookieHeader ?? "")
    .split(";")
    .map((part) => part.split("=")[0]?.trim());
  if (names.includes(SECURE_COOKIE)) return SECURE_COOKIE;
  if (names.includes(PLAIN_COOKIE)) return PLAIN_COOKIE;
  // No cookie seen (shouldn't happen for a signed-in web caller): match
  // NextAuth's own default for the deployment
  return process.env.NEXTAUTH_URL?.startsWith("https://") || process.env.VERCEL
    ? SECURE_COOKIE
    : PLAIN_COOKIE;
}

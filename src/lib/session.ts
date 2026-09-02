import { getServerSession, type Session } from "next-auth";
import { headers } from "next/headers";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { bearerFromAuthorization, readMobileToken } from "@/lib/mobile-token";

/**
 * The current caller's session, whichever way they authenticated.
 *
 * Drop-in for `getServerSession(authOptions)` in route handlers: a browser
 * arrives with the NextAuth cookie and gets the usual session; the native
 * app arrives with `Authorization: Bearer <token>` (lib/mobile-token.ts)
 * and gets a `Session` of exactly the same shape. Route code never learns
 * which — the role guards, demo lock and scoping all read `session.user`.
 *
 * A bearer header that fails to decode is a refusal, not a fall-through to
 * the cookie: the caller told us how they're authenticating, and a stale
 * cookie sitting next to an expired token must not quietly extend it.
 *
 * Both kinds of session are stateless 30-day tokens, so this is also where
 * a deleted account is turned away: one primary-key lookup per request,
 * which is what makes "delete my account" end the session on every device
 * instead of a month later.
 */
export async function getSession(): Promise<Session | null> {
  const authorization = (await headers()).get("authorization");
  const bearer = bearerFromAuthorization(authorization);
  const session = bearer
    ? await sessionFromBearer(bearer)
    : await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const live = await prisma.user.count({
    where: { id: session.user.id, deletedAt: null },
  });
  return live > 0 ? session : null;
}

/** Build a `Session` from a mobile token, or null when it doesn't verify. */
export async function sessionFromBearer(token: string): Promise<Session | null> {
  const claims = await readMobileToken(token);
  if (!claims) return null;
  return {
    user: {
      id: claims.id,
      role: claims.role,
      email: claims.email,
      name: claims.name,
      image: null,
    },
    expires: new Date(claims.expiresAt * 1000).toISOString(),
  };
}

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { isLockedDemoAccount } from "@/lib/demo";
import { bearerFromAuthorization, createMobileToken, readMobileToken } from "@/lib/mobile-token";
import { sessionStillValid } from "@/lib/session-validity";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/mobile/refresh — trade a still-valid bearer token for a
 * fresh 30-day one, so a client who opens the app even occasionally is
 * never signed out. Re-checks the account on every refresh: a token issued
 * before the account was deleted (or the demo lock engaged, or the password
 * changed) stops here.
 *
 * Same response shape as /login. An expired or bad token is a 401 — the
 * app treats that as "sign in again", never as an error to retry.
 */
export async function POST(req: Request) {
  const claims = await readMobileToken(
    bearerFromAuthorization(req.headers.get("authorization"))
  );
  if (!claims) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const account = await prisma.user.findFirst({
    where: { id: claims.id, deletedAt: null },
    select: { id: true, email: true, name: true, role: true, sessionVersion: true },
  });
  if (
    !account ||
    isLockedDemoAccount(account.email) ||
    // Revoked by a password change or reset since this login was issued
    !sessionStillValid(claims.sessionVersion, account.sessionVersion)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { sessionVersion, ...user } = account;

  // At the version just checked, so a later password change still ends it
  const minted = await createMobileToken(user, Date.now(), sessionVersion);
  if (!minted) {
    console.error("[AUTH_ALERT] NEXTAUTH_SECRET unset — cannot mint mobile token");
    return NextResponse.json({ error: "Refresh unavailable" }, { status: 500 });
  }

  return NextResponse.json({
    token: minted.token,
    expiresAt: minted.expiresAt.toISOString(),
    user,
  });
}

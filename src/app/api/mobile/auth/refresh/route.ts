import { NextResponse } from "next/server";
import { getBearerUser } from "@/lib/mobile-auth";
import { signMobileToken } from "@/lib/mobile-token";

/**
 * POST /api/mobile/auth/refresh
 *
 * Exchanges a valid (not yet expired) Bearer token for a fresh 30-day one, so
 * an active user is never force-logged-out at the 30-day mark. The new token
 * is signed from the live user row, so claims that drifted since login
 * (email, role) come out corrected.
 *
 * An expired token cannot be refreshed — the app must log in again. And since
 * getBearerUser re-checks the account on every call, a soft-deleted user can
 * neither refresh nor keep using an old token.
 *
 * Success:  200 { token: string, user: { id, name, email, role } }
 * Failure:  401 { error: "Invalid or expired token" }
 */
export async function POST(req: Request) {
  const user = await getBearerUser(req);
  if (!user) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  const token = await signMobileToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  return NextResponse.json({ token, user });
}

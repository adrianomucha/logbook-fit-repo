import { NextResponse } from "next/server";
import { getBearerUser } from "@/lib/mobile-auth";

/**
 * GET /api/mobile/auth/session
 *
 * Cold-launch token check for the iOS client app. The app calls this with its
 * stored Bearer token to learn whether the token is still good — and gets the
 * current profile back, so a name/email/role changed since login is reflected
 * without re-authenticating.
 *
 * Success:  200 { user: { id, name, email, role } }
 * Failure:  401 { error: "Invalid or expired token" }
 */
export async function GET(req: Request) {
  const user = await getBearerUser(req);
  if (!user) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }
  return NextResponse.json({ user });
}

import { NextResponse } from "next/server";
import { verifyCredentials } from "@/lib/credentials";
import { createMobileToken } from "@/lib/mobile-token";
import { getClientIp } from "@/lib/rate-limit";
import { parseBody } from "@/lib/validations/parseBody";
import { mobileLoginSchema } from "@/lib/validations/schemas";
import {
  LOGIN_ERROR_DEMO_LOCKED,
  LOGIN_ERROR_RATE_LIMITED,
} from "@/lib/auth-errors";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/mobile/login — sign-in for the native app.
 *
 * Same checks as the web's credentials provider (lib/credentials.ts), but
 * the result is a bearer token instead of a cookie:
 *   { token, expiresAt, user: { id, email, name, role } }
 * Store the token in the keychain and send it as `Authorization: Bearer`.
 * Refresh it before `expiresAt` via /api/auth/mobile/refresh.
 *
 * Error codes mirror the login page's: `rate_limited` (429) and
 * `demo_locked` (403) are safe to show; a wrong email or password is a
 * generic 401 so the endpoint can't be used to find out which addresses
 * have accounts.
 */
export async function POST(req: Request) {
  const result = await parseBody(req, mobileLoginSchema);
  if (!result.success) return result.response;

  const check = await verifyCredentials({
    email: result.data.email,
    password: result.data.password,
    ip: getClientIp(req),
  });

  if (!check.ok) {
    switch (check.reason) {
      case "rate_limited":
        return NextResponse.json(
          {
            error: "Too many sign-in attempts. Try again in a few minutes.",
            code: LOGIN_ERROR_RATE_LIMITED,
          },
          { status: 429 }
        );
      case "demo_locked":
        return NextResponse.json(
          {
            error: "Demo sign-in is switched off on this deployment.",
            code: LOGIN_ERROR_DEMO_LOCKED,
          },
          { status: 403 }
        );
      default:
        return NextResponse.json(
          { error: "Invalid email or password" },
          { status: 401 }
        );
    }
  }

  const minted = await createMobileToken(check.user);
  if (!minted) {
    console.error("[AUTH_ALERT] NEXTAUTH_SECRET unset — cannot mint mobile token");
    return NextResponse.json({ error: "Sign-in unavailable" }, { status: 500 });
  }

  return NextResponse.json({
    token: minted.token,
    expiresAt: minted.expiresAt.toISOString(),
    user: check.user,
  });
}

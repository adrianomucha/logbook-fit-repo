import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { loginLimiter, getClientIp } from "@/lib/rate-limit";
import { parseBody } from "@/lib/validations/parseBody";
import { mobileLoginSchema } from "@/lib/validations/schemas";
import { signMobileToken } from "@/lib/mobile-token";

/**
 * POST /api/mobile/auth/login
 *
 * Token-based login for the iOS client app. Validates email + password against the
 * same User table as the web NextAuth credential flow, then returns a 30-day signed
 * JWT for the `Authorization: Bearer` header.
 *
 * Additive only — does not touch web cookie sessions. See lib/mobile-token.ts and
 * the Bearer fallback in lib/middleware/withAuth.ts.
 *
 * Body:     { email: string, password: string }
 * Success:  200 { token: string, user: { id, name, email, role } }
 * Failure:  401 { error: "Invalid credentials" }  ·  429 when rate-limited
 */
export async function POST(req: Request) {
  const result = await parseBody(req, mobileLoginSchema);
  if (!result.success) return result.response;
  const { email, password } = result.data;

  // Same brute-force protection as the web credential flow (keyed by IP + email).
  const ip = getClientIp(req);
  const { allowed } = loginLimiter(`${ip}:${email}`);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429 }
    );
  }

  const user = await prisma.user.findFirst({
    where: { email, deletedAt: null },
  });

  // Identical 401 whether the account is missing or the password is wrong — no enumeration.
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = await signMobileToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  return NextResponse.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
}

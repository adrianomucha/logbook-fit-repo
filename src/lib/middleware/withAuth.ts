import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getCoachProfileId, getClientProfileId } from "@/lib/scoping";
import { Session } from "next-auth";
import { getBearerUser } from "@/lib/mobile-auth";

/**
 * Resolves the authenticated session from EITHER source:
 *   1. the NextAuth cookie session (web app), or
 *   2. an `Authorization: Bearer <jwt>` header (iOS client app).
 *
 * The cookie session takes precedence, so existing web behaviour is unchanged —
 * the Bearer path is only consulted when there is no cookie session. Returns the
 * resolved Session, or null if neither source authenticates.
 *
 * Bearer sessions are built from the live user row, not the token claims —
 * see getBearerUser for why.
 */
export async function getAuthSession(req: Request): Promise<Session | null> {
  const cookieSession = await getServerSession(authOptions);
  if (cookieSession) return cookieSession;

  const user = await getBearerUser(req);
  if (user) {
    return {
      user: { id: user.id, role: user.role, email: user.email },
      expires: "",
    } as Session;
  }

  return null;
}

type CoachHandler = (
  req: Request,
  ctx: { params: Record<string, string> },
  session: Session,
  coachProfileId: string
) => Promise<NextResponse>;

type ClientHandler = (
  req: Request,
  ctx: { params: Record<string, string> },
  session: Session,
  clientProfileId: string
) => Promise<NextResponse>;

/**
 * Wraps a route handler to enforce COACH role and inject coachProfileId.
 * Handler receives the resolved coachProfileId for scoped queries.
 */
export function withCoach(handler: CoachHandler) {
  return async (req: Request, ctx: { params: Promise<Record<string, string>> }) => {
    const session = await getAuthSession(req);
    if (!session || session.user.role !== "COACH") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    try {
      const coachProfileId = await getCoachProfileId(session);
      const params = await ctx.params;
      return handler(req, { params }, session, coachProfileId);
    } catch {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }
  };
}

/**
 * Wraps a route handler to enforce CLIENT role and inject clientProfileId.
 */
export function withClient(handler: ClientHandler) {
  return async (req: Request, ctx: { params: Promise<Record<string, string>> }) => {
    const session = await getAuthSession(req);
    if (!session || session.user.role !== "CLIENT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    try {
      const clientProfileId = await getClientProfileId(session);
      const params = await ctx.params;
      return handler(req, { params }, session, clientProfileId);
    } catch {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }
  };
}

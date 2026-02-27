import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getCoachProfileId, getClientProfileId } from "@/lib/scoping";
import { Session } from "next-auth";

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
    const session = await getServerSession(authOptions);
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
    const session = await getServerSession(authOptions);
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

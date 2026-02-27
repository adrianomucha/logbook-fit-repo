import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

/**
 * GET /api/check-ins/[id]
 * Returns a check-in. Accessible by both the coach who created it
 * and the client it's for.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<Record<string, string>> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: checkInId } = await ctx.params;

  const checkIn = await prisma.checkIn.findUnique({
    where: { id: checkInId },
    include: {
      coach: {
        include: {
          user: { select: { id: true, name: true } },
        },
      },
      client: {
        include: {
          user: { select: { id: true, name: true } },
          completions: {
            where: { status: "COMPLETED" },
            orderBy: { completedAt: "desc" },
            take: 5,
            select: {
              id: true,
              completedAt: true,
              completionPct: true,
              effortRating: true,
              day: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  if (!checkIn) {
    return NextResponse.json({ error: "Check-in not found" }, { status: 404 });
  }

  // Verify requester is either the coach or the client
  const userId = session.user.id;
  const isCoach = checkIn.coach.user.id === userId;
  const isClient = checkIn.client.user.id === userId;

  if (!isCoach && !isClient) {
    return NextResponse.json({ error: "Check-in not found" }, { status: 404 });
  }

  return NextResponse.json(checkIn);
}

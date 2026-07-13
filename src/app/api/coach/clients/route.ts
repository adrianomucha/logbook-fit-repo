import { NextResponse } from "next/server";
import { withCoach } from "@/lib/middleware/withAuth";
import prisma from "@/lib/prisma";
import { Session } from "next-auth";

/**
 * GET /api/coach/clients
 * Returns all clients for the authenticated coach.
 * ?status=ended returns the archive instead: ended relationships with the
 * termination audit, so the coach can review past clients and restore one.
 */
export const GET = withCoach(
  async (
    req: Request,
    _ctx: { params: Record<string, string> },
    _session: Session,
    coachProfileId: string
  ) => {
    if (new URL(req.url).searchParams.get("status") === "ended") {
      const ended = await prisma.coachClientRelationship.findMany({
        where: { coachId: coachProfileId, status: "INACTIVE" },
        include: {
          client: {
            include: {
              user: {
                select: { id: true, name: true, email: true, avatarUrl: true },
              },
            },
          },
        },
        orderBy: { endedAt: "desc" },
      });

      return NextResponse.json(
        ended.map((rel) => ({
          clientProfileId: rel.client.id,
          user: rel.client.user,
          joinedAt: rel.createdAt,
          endedAt: rel.endedAt,
          endedBy: rel.endedBy,
        }))
      );
    }

    const relationships = await prisma.coachClientRelationship.findMany({
      // Ended relationships are history, not roster
      where: { coachId: coachProfileId, status: "ACTIVE" },
      include: {
        client: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
            activePlan: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const clients = relationships.map((rel) => ({
      clientProfileId: rel.client.id,
      user: rel.client.user,
      activePlan: rel.client.activePlan,
      relationshipStatus: rel.status,
      joinedAt: rel.createdAt,
    }));

    return NextResponse.json(clients);
  }
);

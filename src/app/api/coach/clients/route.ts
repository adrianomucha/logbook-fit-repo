import { NextResponse } from "next/server";
import { withCoach } from "@/lib/middleware/withAuth";
import prisma from "@/lib/prisma";
import { Session } from "next-auth";

/**
 * GET /api/coach/clients
 * Returns all clients for the authenticated coach.
 */
export const GET = withCoach(
  async (
    _req: Request,
    _ctx: { params: Record<string, string> },
    _session: Session,
    coachProfileId: string
  ) => {
    const relationships = await prisma.coachClientRelationship.findMany({
      where: { coachId: coachProfileId },
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

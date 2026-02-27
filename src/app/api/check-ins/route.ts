import { NextResponse } from "next/server";
import { withCoach } from "@/lib/middleware/withAuth";
import prisma from "@/lib/prisma";
import { Session } from "next-auth";

/**
 * POST /api/check-ins
 * Coach initiates a check-in for a client (status: PENDING).
 */
export const POST = withCoach(
  async (
    req: Request,
    _ctx: { params: Record<string, string> },
    _session: Session,
    coachProfileId: string
  ) => {
    const body = await req.json();
    const { clientProfileId } = body as { clientProfileId?: string };

    if (!clientProfileId) {
      return NextResponse.json(
        { error: "clientProfileId is required" },
        { status: 400 }
      );
    }

    // Verify coach-client relationship
    const relationship = await prisma.coachClientRelationship.findFirst({
      where: {
        coachId: coachProfileId,
        clientId: clientProfileId,
        status: "ACTIVE",
      },
    });
    if (!relationship) {
      return NextResponse.json(
        { error: "No active relationship with this client" },
        { status: 404 }
      );
    }

    const checkIn = await prisma.checkIn.create({
      data: {
        coachId: coachProfileId,
        clientId: clientProfileId,
        status: "PENDING",
      },
      include: {
        client: {
          select: {
            user: { select: { name: true } },
          },
        },
      },
    });

    return NextResponse.json(checkIn, { status: 201 });
  }
);

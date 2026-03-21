import { NextResponse } from "next/server";
import { withCoach } from "@/lib/middleware/withAuth";
import prisma from "@/lib/prisma";
import { Session } from "next-auth";
import { parseBody } from "@/lib/validations/parseBody";
import { createCheckInSchema } from "@/lib/validations/schemas";

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
    const result = await parseBody(req, createCheckInSchema);
    if (!result.success) return result.response;
    const { clientProfileId } = result.data;

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

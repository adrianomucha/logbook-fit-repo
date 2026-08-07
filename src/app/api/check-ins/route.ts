import { NextResponse } from "next/server";
import { withCoach } from "@/lib/middleware/withAuth";
import prisma from "@/lib/prisma";
import { Session } from "next-auth";
import { parseBody } from "@/lib/validations/parseBody";
import { createCheckInSchema } from "@/lib/validations/schemas";
import { notifyCheckInSent } from "@/lib/push";

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

    // One at a time — a double-click or stale tab must not stack a second
    // check-in on an open one (the UI only ever shows the newest)
    const openCheckIn = await prisma.checkIn.findFirst({
      where: {
        clientId: clientProfileId,
        status: { in: ["PENDING", "CLIENT_RESPONDED"] },
      },
      select: { id: true },
    });
    if (openCheckIn) {
      return NextResponse.json(
        { error: "A check-in is already in progress for this client" },
        { status: 409 }
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
            userId: true,
            user: { select: { name: true } },
          },
        },
        coach: {
          select: { user: { select: { name: true } } },
        },
      },
    });

    // Awaited, not fired and forgotten — a serverless function can freeze the
    // moment it responds. notifyCheckInSent swallows its own errors, so a
    // failed push can never fail the check-in.
    await notifyCheckInSent({
      clientUserId: checkIn.client.userId,
      coachName: checkIn.coach.user.name,
    });

    return NextResponse.json(checkIn, { status: 201 });
  }
);

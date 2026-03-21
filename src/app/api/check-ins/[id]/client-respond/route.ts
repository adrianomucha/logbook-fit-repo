import { NextResponse } from "next/server";
import { withClient } from "@/lib/middleware/withAuth";
import prisma from "@/lib/prisma";
import { Session } from "next-auth";
import { parseBody } from "@/lib/validations/parseBody";
import { clientRespondSchema } from "@/lib/validations/schemas";

/**
 * PUT /api/check-ins/[id]/client-respond
 * Client responds to a pending check-in.
 * Transitions status: PENDING → CLIENT_RESPONDED
 */
export const PUT = withClient(
  async (
    req: Request,
    ctx: { params: Record<string, string> },
    _session: Session,
    clientProfileId: string
  ) => {
    const checkInId = ctx.params.id;

    const checkIn = await prisma.checkIn.findFirst({
      where: {
        id: checkInId,
        clientId: clientProfileId,
        status: "PENDING",
      },
    });

    if (!checkIn) {
      return NextResponse.json(
        { error: "Check-in not found or already responded" },
        { status: 404 }
      );
    }

    const result = await parseBody(req, clientRespondSchema);
    if (!result.success) return result.response;
    const { effortRating, painBlockers, clientFeeling } = result.data;

    const updated = await prisma.checkIn.update({
      where: { id: checkInId },
      data: {
        status: "CLIENT_RESPONDED",
        effortRating: effortRating ? (effortRating as never) : undefined,
        painBlockers,
        clientFeeling,
        clientRespondedAt: new Date(),
      },
    });

    return NextResponse.json(updated);
  }
);

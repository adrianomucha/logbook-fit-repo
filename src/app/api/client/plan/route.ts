import { NextResponse } from "next/server";
import { withClient } from "@/lib/middleware/withAuth";
import prisma from "@/lib/prisma";
import { Session } from "next-auth";

/**
 * GET /api/client/plan
 * Returns the client's active plan with all weeks, days, and exercises.
 */
export const GET = withClient(
  async (
    _req: Request,
    _ctx: { params: Record<string, string> },
    _session: Session,
    clientProfileId: string
  ) => {
    const client = await prisma.clientProfile.findUnique({
      where: { id: clientProfileId },
      select: { activePlanId: true },
    });

    if (!client?.activePlanId) {
      return NextResponse.json(
        { error: "No active plan assigned" },
        { status: 404 }
      );
    }

    const plan = await prisma.plan.findFirst({
      where: {
        id: client.activePlanId,
        deletedAt: null,
      },
      include: {
        weeks: {
          orderBy: { weekNumber: "asc" },
          include: {
            days: {
              orderBy: { dayNumber: "asc" },
              include: {
                exercises: {
                  orderBy: { orderIndex: "asc" },
                  include: {
                    exercise: {
                      select: {
                        id: true,
                        name: true,
                        category: true,
                        instructions: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!plan) {
      return NextResponse.json(
        { error: "Plan not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(plan);
  }
);

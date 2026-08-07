import { NextResponse } from "next/server";
import { withCoach } from "@/lib/middleware/withAuth";
import prisma from "@/lib/prisma";
import { coachScope } from "@/lib/scoping";
import { Session } from "next-auth";
import { parseBody } from "@/lib/validations/parseBody";
import { assignPlanSchema } from "@/lib/validations/schemas";
import { clonePlanForClient } from "@/lib/plan-clone";
import { notifyPlanAssigned } from "@/lib/push";

/**
 * POST /api/plans/[id]/assign
 * Gives the client their OWN COPY of the plan (clone-on-assign) — editing
 * the template later never mutates a plan a client is mid-workout on.
 * Coach must own the plan and have an active relationship with the client.
 */
export const POST = withCoach(
  async (
    req: Request,
    ctx: { params: Record<string, string> },
    _session: Session,
    coachProfileId: string
  ) => {
    const planId = ctx.params.id;

    // Verify coach owns the plan
    const plan = await prisma.plan.findFirst({
      where: {
        id: planId,
        ...coachScope(coachProfileId),
      },
    });
    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    const result = await parseBody(req, assignPlanSchema);
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

    // Re-assigning the plan the client is already on must not restart their
    // progress — planStartDate drives which week they're in. "Already on it"
    // means either a legacy direct assignment or a copy cloned from it.
    const current = await prisma.clientProfile.findUnique({
      where: { id: clientProfileId },
      select: {
        id: true,
        activePlanId: true,
        planStartDate: true,
        user: { select: { name: true } },
        activePlan: { select: { sourceTemplateId: true } },
      },
    });
    if (
      current?.activePlanId === planId ||
      (current?.activePlan?.sourceTemplateId != null &&
        current.activePlan.sourceTemplateId === planId)
    ) {
      return NextResponse.json({
        id: current.id,
        activePlanId: current.activePlanId,
        planStartDate: current.planStartDate,
        user: current.user,
      });
    }

    // Clone-on-assign: the client gets their own copy of the plan
    const instance = await clonePlanForClient(planId, coachProfileId);
    if (!instance) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    const updatedClient = await prisma.clientProfile.update({
      where: { id: clientProfileId },
      data: {
        activePlanId: instance.id,
        planStartDate: new Date(),
      },
      select: {
        id: true,
        userId: true,
        activePlanId: true,
        planStartDate: true,
        user: { select: { name: true } },
      },
    });

    // Until now a client waiting on their first plan had no way to learn it
    // had landed except by reopening the app.
    const coach = await prisma.coachProfile.findUnique({
      where: { id: coachProfileId },
      select: { user: { select: { name: true } } },
    });
    await notifyPlanAssigned({
      clientUserId: updatedClient.userId,
      coachName: coach?.user.name ?? null,
      planName: instance.name,
    });

    return NextResponse.json(updatedClient);
  }
);

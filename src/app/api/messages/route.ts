import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { isLockedDemoAccount } from "@/lib/demo";
import prisma from "@/lib/prisma";
import { notifyNewMessage } from "@/lib/push";
import { parseBody } from "@/lib/validations/parseBody";
import { sendMessageSchema } from "@/lib/validations/schemas";

/**
 * POST /api/messages
 * Sends a message. Verifies sender and recipient have an active
 * CoachClientRelationship. Supports optional exercise context references.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || isLockedDemoAccount(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await parseBody(req, sendMessageSchema);
  if (!result.success) return result.response;
  const { content, workoutReferenceId, exerciseReferenceId } = result.data;
  let { recipientId } = result.data;

  const senderId = session.user.id;

  // Verify active relationship between sender and recipient
  // One must be a coach and the other a client
  const senderProfile = await prisma.user.findUnique({
    where: { id: senderId },
    include: {
      coachProfile: { select: { id: true } },
      clientProfile: { select: { id: true } },
    },
  });

  // A client's messages can only go to their coach — resolve the recipient
  // server-side when it's omitted, so client surfaces don't need to know
  // the coach's user id
  if (!recipientId) {
    if (!senderProfile?.clientProfile) {
      return NextResponse.json(
        { error: "recipientId is required" },
        { status: 400 }
      );
    }
    const rel = await prisma.coachClientRelationship.findFirst({
      where: { clientId: senderProfile.clientProfile.id, status: "ACTIVE" },
      include: { coach: { select: { userId: true } } },
    });
    if (!rel) {
      return NextResponse.json(
        { error: "No active relationship with recipient" },
        { status: 403 }
      );
    }
    recipientId = rel.coach.userId;
  }

  const recipientProfile = await prisma.user.findUnique({
    where: { id: recipientId },
    include: {
      coachProfile: { select: { id: true } },
      clientProfile: { select: { id: true } },
    },
  });

  if (!senderProfile || !recipientProfile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Check for active relationship
  let hasRelationship = false;

  if (senderProfile.coachProfile && recipientProfile.clientProfile) {
    // Sender is coach, recipient is client
    const rel = await prisma.coachClientRelationship.findFirst({
      where: {
        coachId: senderProfile.coachProfile.id,
        clientId: recipientProfile.clientProfile.id,
        status: "ACTIVE",
      },
    });
    hasRelationship = !!rel;
  } else if (senderProfile.clientProfile && recipientProfile.coachProfile) {
    // Sender is client, recipient is coach
    const rel = await prisma.coachClientRelationship.findFirst({
      where: {
        coachId: recipientProfile.coachProfile.id,
        clientId: senderProfile.clientProfile.id,
        status: "ACTIVE",
      },
    });
    hasRelationship = !!rel;
  }

  if (!hasRelationship) {
    return NextResponse.json(
      { error: "No active relationship with recipient" },
      { status: 403 }
    );
  }

  // Validate optional reference IDs belong to the relationship context
  if (workoutReferenceId) {
    // The referenced workout must belong to the client in this relationship
    const clientProfileId =
      senderProfile.clientProfile?.id ?? recipientProfile.clientProfile?.id;
    const workoutRef = await prisma.workoutCompletion.findFirst({
      where: { id: workoutReferenceId, clientId: clientProfileId! },
      select: { id: true },
    });
    if (!workoutRef) {
      return NextResponse.json(
        { error: "workoutReferenceId not found in relationship context" },
        { status: 400 }
      );
    }
  }

  if (exerciseReferenceId) {
    // The referenced exercise must belong to a plan assigned to the client
    const clientProfileId =
      senderProfile.clientProfile?.id ?? recipientProfile.clientProfile?.id;
    const exerciseRef = await prisma.workoutExercise.findFirst({
      where: {
        id: exerciseReferenceId,
        day: {
          week: {
            plan: { assignedTo: { some: { id: clientProfileId! } } },
          },
        },
      },
      select: { id: true },
    });
    if (!exerciseRef) {
      return NextResponse.json(
        { error: "exerciseReferenceId not found in relationship context" },
        { status: 400 }
      );
    }
  }

  const message = await prisma.message.create({
    data: {
      senderId,
      recipientId,
      content,
      workoutReferenceId: workoutReferenceId || null,
      exerciseReferenceId: exerciseReferenceId || null,
    },
    include: {
      sender: { select: { id: true, name: true, avatarUrl: true } },
    },
  });

  // Push it to the recipient's devices. Awaited rather than fired and
  // forgotten — a serverless function can be frozen the moment it responds,
  // which would drop the notification — but never allowed to fail the send:
  // notifyNewMessage swallows its own errors.
  await notifyNewMessage({
    recipientId,
    senderId,
    senderName: message.sender.name,
    content,
    // Each app keeps the thread somewhere different: the coach's lives under
    // the client's profile, the client's on their chat tab.
    url: senderProfile.clientProfile
      ? `/coach/clients/${senderProfile.clientProfile.id}?chat=1`
      : "/client?tab=chat",
  });

  return NextResponse.json(message, { status: 201 });
}

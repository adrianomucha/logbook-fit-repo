import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

/**
 * POST /api/messages
 * Sends a message. Verifies sender and recipient have an active
 * CoachClientRelationship. Supports optional exercise context references.
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { recipientId, content, workoutReferenceId, exerciseReferenceId } =
    body as {
      recipientId?: string;
      content?: string;
      workoutReferenceId?: string;
      exerciseReferenceId?: string;
    };

  if (!recipientId || !content) {
    return NextResponse.json(
      { error: "recipientId and content are required" },
      { status: 400 }
    );
  }

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

  return NextResponse.json(message, { status: 201 });
}

import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

/**
 * GET /api/messages/[userId]
 * Returns the message thread between the authenticated user and the given userId.
 * Supports pagination via ?cursor=&limit=
 */
export async function GET(
  req: Request,
  ctx: { params: Record<string, string> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const otherUserId = ctx.params.userId;
  const currentUserId = session.user.id;

  if (otherUserId === currentUserId) {
    return NextResponse.json(
      { error: "Cannot message yourself" },
      { status: 400 }
    );
  }

  // Verify relationship exists
  const currentUser = await prisma.user.findUnique({
    where: { id: currentUserId },
    include: {
      coachProfile: { select: { id: true } },
      clientProfile: { select: { id: true } },
    },
  });
  const otherUser = await prisma.user.findUnique({
    where: { id: otherUserId },
    include: {
      coachProfile: { select: { id: true } },
      clientProfile: { select: { id: true } },
    },
  });

  if (!currentUser || !otherUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  let hasRelationship = false;
  if (currentUser.coachProfile && otherUser.clientProfile) {
    const rel = await prisma.coachClientRelationship.findFirst({
      where: {
        coachId: currentUser.coachProfile.id,
        clientId: otherUser.clientProfile.id,
        status: "ACTIVE",
      },
    });
    hasRelationship = !!rel;
  } else if (currentUser.clientProfile && otherUser.coachProfile) {
    const rel = await prisma.coachClientRelationship.findFirst({
      where: {
        coachId: otherUser.coachProfile.id,
        clientId: currentUser.clientProfile.id,
        status: "ACTIVE",
      },
    });
    hasRelationship = !!rel;
  }

  if (!hasRelationship) {
    return NextResponse.json(
      { error: "No active relationship with this user" },
      { status: 403 }
    );
  }

  const url = new URL(req.url);
  const cursor = url.searchParams.get("cursor");
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50"), 100);

  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: currentUserId, recipientId: otherUserId },
        { senderId: otherUserId, recipientId: currentUserId },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      sender: { select: { id: true, name: true, avatarUrl: true } },
      workoutReference: {
        select: {
          id: true,
          day: { select: { name: true } },
          completedAt: true,
        },
      },
      exerciseReference: {
        select: {
          id: true,
          exercise: { select: { name: true } },
        },
      },
    },
  });

  const hasMore = messages.length > limit;
  const result = hasMore ? messages.slice(0, limit) : messages;
  const nextCursor = hasMore ? result[result.length - 1].id : null;

  // Mark messages from the other user as read
  await prisma.message.updateMany({
    where: {
      senderId: otherUserId,
      recipientId: currentUserId,
      readAt: null,
    },
    data: { readAt: new Date() },
  });

  return NextResponse.json({
    messages: result,
    nextCursor,
    hasMore,
  });
}

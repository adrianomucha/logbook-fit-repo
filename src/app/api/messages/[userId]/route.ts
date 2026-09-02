import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { isLockedDemoAccount } from "@/lib/demo";
import prisma from "@/lib/prisma";
import { formatPrescription } from "@/lib/reps";

/**
 * GET /api/messages/[userId]
 * Returns the message thread between the authenticated user and the given userId.
 * Supports pagination via ?cursor=&limit=
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<Record<string, string>> }
) {
  const session = await getSession();
  if (!session || isLockedDemoAccount(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId: otherUserId } = await ctx.params;
  const currentUserId = session.user.id;

  if (otherUserId === currentUserId) {
    return NextResponse.json(
      { error: "Cannot message yourself" },
      { status: 400 }
    );
  }

  // Verify relationship exists. Both users in one query — this endpoint is
  // polled every few seconds while a chat is open, so every saved round trip
  // to the database counts.
  const users = await prisma.user.findMany({
    where: { id: { in: [currentUserId, otherUserId] } },
    include: {
      coachProfile: { select: { id: true } },
      clientProfile: { select: { id: true } },
    },
  });
  const currentUser = users.find((u) => u.id === currentUserId);
  const otherUser = users.find((u) => u.id === otherUserId);

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
      // Everything the chat's exercise-context card renders: the name, the
      // prescription it was flagged against, how far the client got, and the
      // flag note. Without the prescription/set columns the card had nothing
      // to show, so the structured half of "flag + message coach" was
      // invisible to both sides.
      exerciseReference: {
        select: {
          id: true,
          trackingType: true,
          sets: true,
          reps: true,
          repsMax: true,
          weight: true,
          exercise: { select: { name: true } },
          setCompletions: {
            select: { workoutCompletionId: true, completed: true },
          },
          flags: {
            select: { workoutCompletionId: true, note: true },
          },
        },
      },
    },
  });

  const hasMore = messages.length > limit;
  const result = hasMore ? messages.slice(0, limit) : messages;
  const nextCursor = hasMore ? result[result.length - 1].id : null;

  // Flatten the exercise join into the card's shape here rather than shipping
  // raw relations. Sets and flags are scoped to this message's own workout —
  // the same exercise recurs every week, so unscoped counts would describe the
  // wrong session.
  const shaped = result.map((message) => {
    const ref = message.exerciseReference;
    if (!ref) {
      const { exerciseReference: _drop, ...rest } = message;
      return { ...rest, exerciseContext: null };
    }

    const completionId = message.workoutReferenceId;
    const setsForWorkout = completionId
      ? ref.setCompletions.filter((s) => s.workoutCompletionId === completionId)
      : [];
    const flag = completionId
      ? ref.flags.find((f) => f.workoutCompletionId === completionId)
      : undefined;

    const { exerciseReference: _drop, ...rest } = message;
    return {
      ...rest,
      exerciseContext: {
        exerciseId: ref.id,
        exerciseName: ref.exercise.name,
        prescription: formatPrescription({
          sets: ref.sets,
          reps: ref.reps,
          repsMax: ref.repsMax,
          weight: ref.weight,
          trackingType: ref.trackingType,
        }),
        setsCompleted: setsForWorkout.filter((s) => s.completed).length,
        totalSets: ref.sets,
        flagNote: flag?.note ?? null,
      },
    };
  });

  // Mark messages from the other user as read — but only when the caller
  // says the chat is actually on screen (?markRead=1). Both dashboards poll
  // this thread in the background; stamping readAt on every poll would mark
  // messages read that were never seen.
  if (url.searchParams.get("markRead") === "1") {
    await prisma.message.updateMany({
      where: {
        senderId: otherUserId,
        recipientId: currentUserId,
        readAt: null,
      },
      data: { readAt: new Date() },
    });
  }

  return NextResponse.json(
    {
      messages: shaped,
      nextCursor,
      hasMore,
    },
    // Chat threads must never be answered from a browser or proxy cache — a
    // stale hit here is exactly the "messages only arrive after restarting the
    // app" symptom.
    { headers: { "Cache-Control": "no-store" } }
  );
}

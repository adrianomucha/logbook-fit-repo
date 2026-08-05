import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { isLockedDemoAccount } from "@/lib/demo";
import prisma from "@/lib/prisma";

/**
 * GET /api/messages/unread
 * Unread message counts for the signed-in user, grouped by the person who
 * sent them. Drives the nav badges and the in-app "new message" toast, and is
 * polled app-wide — so it stays deliberately small: two grouped queries plus
 * one name lookup, no message bodies except the newest per thread.
 *
 * Only threads with a live coaching relationship are counted. Messages
 * outlive the relationship, and a badge you can't clear (the chat is gone
 * with the coach) is a permanent dead end.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || isLockedDemoAccount(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currentUserId = session.user.id;

  const me = await prisma.user.findUnique({
    where: { id: currentUserId },
    select: {
      coachProfile: { select: { id: true } },
      clientProfile: { select: { id: true } },
    },
  });

  // The set of people this user can currently exchange messages with.
  let counterpartUserIds: string[] = [];
  if (me?.coachProfile) {
    const relationships = await prisma.coachClientRelationship.findMany({
      where: { coachId: me.coachProfile.id, status: "ACTIVE" },
      select: { client: { select: { userId: true } } },
    });
    counterpartUserIds = relationships.map((rel) => rel.client.userId);
  } else if (me?.clientProfile) {
    const relationship = await prisma.coachClientRelationship.findFirst({
      where: { clientId: me.clientProfile.id, status: "ACTIVE" },
      select: { coach: { select: { userId: true } } },
    });
    if (relationship) counterpartUserIds = [relationship.coach.userId];
  }

  if (counterpartUserIds.length === 0) {
    return NextResponse.json(
      { total: 0, threads: [] },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  const grouped = await prisma.message.groupBy({
    by: ["senderId"],
    where: {
      recipientId: currentUserId,
      readAt: null,
      senderId: { in: counterpartUserIds },
    },
    _count: { _all: true },
    _max: { createdAt: true },
  });

  if (grouped.length === 0) {
    return NextResponse.json(
      { total: 0, threads: [] },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  const senderIds = grouped.map((row) => row.senderId);

  // Names for the toast, plus the client profile id the coach app routes by
  // (its thread lives at /coach/clients/[clientProfileId]).
  const senders = await prisma.user.findMany({
    where: { id: { in: senderIds } },
    select: {
      id: true,
      name: true,
      clientProfile: { select: { id: true } },
    },
  });
  const senderById = new Map(senders.map((user) => [user.id, user]));

  // Newest message per thread — the toast shows a preview, so it needs the
  // body of exactly one message per sender. Bounded: counts come from the
  // grouped query above and stay exact, so the only thing a huge unread
  // backlog costs here is a preview, never a wrong number.
  const latestMessages = await prisma.message.findMany({
    where: {
      recipientId: currentUserId,
      readAt: null,
      senderId: { in: senderIds },
    },
    orderBy: { createdAt: "desc" },
    distinct: ["senderId"],
    take: 100,
    select: { senderId: true, content: true, createdAt: true },
  });
  const latestBySender = new Map(latestMessages.map((m) => [m.senderId, m]));

  const threads = grouped
    .map((row) => {
      const sender = senderById.get(row.senderId);
      const latest = latestBySender.get(row.senderId);
      return {
        userId: row.senderId,
        name: sender?.name ?? null,
        /** Present when the sender is a client — the coach app routes by it */
        clientProfileId: sender?.clientProfile?.id ?? null,
        count: row._count._all,
        lastMessageAt:
          row._max.createdAt?.toISOString() ??
          latest?.createdAt.toISOString() ??
          null,
        preview: latest?.content.slice(0, 140) ?? "",
      };
    })
    .sort((a, b) => (b.lastMessageAt ?? "").localeCompare(a.lastMessageAt ?? ""));

  const total = threads.reduce((sum, thread) => sum + thread.count, 0);

  return NextResponse.json(
    { total, threads },
    { headers: { "Cache-Control": "no-store" } }
  );
}

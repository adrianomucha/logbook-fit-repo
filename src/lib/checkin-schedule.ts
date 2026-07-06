import prisma from "@/lib/prisma";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Lazily materialize the weekly check-in schedule for one coach-client pair.
 *
 * There is no cron in this app, so "auto-sends every 7 days" is enforced at
 * read time: call this when either party loads check-in data. If the
 * relationship has the schedule enabled, there's no check-in currently in
 * flight, and the most recent one is at least 7 days old (or none exists),
 * a fresh PENDING check-in is created.
 *
 * Returns the created check-in, or null when nothing was due.
 */
export async function ensureScheduledCheckIn(relationship: {
  coachId: string;
  clientId: string;
  status: string;
  checkInScheduleEnabled: boolean;
}) {
  if (!relationship.checkInScheduleEnabled || relationship.status !== "ACTIVE") {
    return null;
  }

  const latest = await prisma.checkIn.findFirst({
    where: { clientId: relationship.clientId },
    orderBy: { createdAt: "desc" },
    select: { status: true, createdAt: true },
  });

  // One at a time — never stack a scheduled check-in on an open one
  if (latest && (latest.status === "PENDING" || latest.status === "CLIENT_RESPONDED")) {
    return null;
  }
  if (latest && Date.now() - latest.createdAt.getTime() < SEVEN_DAYS_MS) {
    return null;
  }

  return prisma.checkIn.create({
    data: {
      coachId: relationship.coachId,
      clientId: relationship.clientId,
    },
  });
}

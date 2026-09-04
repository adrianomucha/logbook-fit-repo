import prisma from "@/lib/prisma";
import { isDemoAccount } from "@/lib/demo";

/**
 * Aggregates for /admin — the owner's overview of how the product is being
 * used. Counts only; no message contents or per-person activity. Chat is a
 * private channel between a coach and their client, so the admin surface
 * reports its volume and never its text.
 *
 * Demo and sample accounts are excluded from every people-count so a seeded
 * database doesn't read as adoption.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export type WeekBucket = {
  /** Monday 00:00 UTC that starts the bucket. */
  weekStart: Date;
  count: number;
};

/** Start of the UTC week (Monday) containing `date`. */
export function startOfUtcWeek(date: Date): Date {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  const dow = (d.getUTCDay() + 6) % 7; // Monday = 0
  d.setUTCDate(d.getUTCDate() - dow);
  return d;
}

/**
 * Buckets timestamps into the trailing `weeks` UTC weeks ending with the
 * current one, oldest first. Empty weeks are present with count 0 so a chart
 * or table doesn't hide a dead stretch. Pure, for tests.
 */
export function bucketByWeek(
  dates: Date[],
  weeks: number,
  now: Date = new Date()
): WeekBucket[] {
  const thisWeek = startOfUtcWeek(now).getTime();
  const buckets: WeekBucket[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    buckets.push({ weekStart: new Date(thisWeek - i * 7 * DAY_MS), count: 0 });
  }
  const first = buckets[0].weekStart.getTime();
  for (const date of dates) {
    const t = date.getTime();
    if (t < first || t > now.getTime()) continue;
    const idx = Math.floor((startOfUtcWeek(date).getTime() - first) / (7 * DAY_MS));
    if (buckets[idx]) buckets[idx].count++;
  }
  return buckets;
}

export type Stat = {
  label: string;
  value: number;
  /** Same metric over the trailing 7 days, when the metric is a flow. */
  last7?: number;
  /** ... and 30 days. */
  last30?: number;
  hint?: string;
};

export type OverviewStats = {
  people: Stat[];
  activity: Stat[];
  funnel: Stat[];
  signupsByWeek: WeekBucket[];
  workoutsByWeek: WeekBucket[];
};

export const OVERVIEW_WEEKS = 8;

export async function getOverviewStats(now: Date = new Date()): Promise<OverviewStats> {
  const since7 = new Date(now.getTime() - 7 * DAY_MS);
  const since30 = new Date(now.getTime() - 30 * DAY_MS);
  const sinceWeeks = new Date(startOfUtcWeek(now).getTime() - (OVERVIEW_WEEKS - 1) * 7 * DAY_MS);

  const [
    users,
    relationships,
    completions,
    checkIns,
    messageCount,
    messages7,
    messages30,
    unreadStale,
    invites,
    waitlist,
    feedbackNew,
  ] = await Promise.all([
    prisma.user.findMany({
      where: { deletedAt: null },
      select: {
        email: true,
        role: true,
        createdAt: true,
        clientProfile: { select: { isSample: true } },
      },
    }),
    prisma.coachClientRelationship.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    // One fetch covers the 7/30-day counts and the weekly bars: the bar
    // window (8 UTC weeks) is always the wider of the two.
    prisma.workoutCompletion.findMany({
      where: {
        status: "COMPLETED",
        completedAt: { gte: sinceWeeks < since30 ? sinceWeeks : since30 },
      },
      select: { completedAt: true },
    }),
    prisma.checkIn.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.message.count(),
    prisma.message.count({ where: { createdAt: { gte: since7 } } }),
    prisma.message.count({ where: { createdAt: { gte: since30 } } }),
    prisma.message.count({
      where: { readAt: null, createdAt: { lt: new Date(now.getTime() - 2 * DAY_MS) } },
    }),
    prisma.clientInvite.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.waitlistEntry.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.feedback.count({ where: { status: "NEW" } }),
  ]);

  const real = users.filter(
    (u) => !isDemoAccount(u.email) && !u.clientProfile?.isSample
  );
  const coaches = real.filter((u) => u.role === "COACH");
  const clients = real.filter((u) => u.role === "CLIENT");
  const joinedSince = (list: typeof real, since: Date) =>
    list.filter((u) => u.createdAt >= since).length;

  const byStatus = <S extends string>(
    rows: { status: S; _count: { _all: number } }[],
    status: S
  ) => rows.find((r) => r.status === status)?._count._all ?? 0;

  const completedAts = completions.flatMap((c) =>
    c.completedAt ? [c.completedAt] : []
  );
  const completed30 = completedAts.filter((d) => d >= since30).length;
  const completed7 = completedAts.filter((d) => d >= since7).length;

  return {
    people: [
      {
        label: "Coaches",
        value: coaches.length,
        last7: joinedSince(coaches, since7),
        last30: joinedSince(coaches, since30),
      },
      {
        label: "Clients",
        value: clients.length,
        last7: joinedSince(clients, since7),
        last30: joinedSince(clients, since30),
      },
      {
        label: "Active pairings",
        value: byStatus(relationships, "ACTIVE"),
        hint: `${byStatus(relationships, "INACTIVE")} ended`,
      },
    ],
    activity: [
      {
        label: "Workouts completed",
        value: completed30,
        last7: completed7,
        last30: completed30,
        hint: "trailing 30 days",
      },
      {
        label: "Check-ins awaiting client",
        value: byStatus(checkIns, "PENDING"),
        hint: `${byStatus(checkIns, "CLIENT_RESPONDED")} awaiting coach · ${byStatus(checkIns, "COMPLETED")} completed`,
      },
      {
        label: "Messages sent",
        value: messageCount,
        last7: messages7,
        last30: messages30,
      },
      {
        label: "Unread over 48h",
        value: unreadStale,
        hint: "messages nobody has opened in two days",
      },
    ],
    funnel: [
      {
        label: "Waitlist pending",
        value: byStatus(waitlist, "PENDING"),
        hint: `${byStatus(waitlist, "INVITED")} invited · ${byStatus(waitlist, "JOINED")} joined`,
      },
      {
        label: "Client invites pending",
        value: byStatus(invites, "PENDING"),
        hint: `${byStatus(invites, "ACCEPTED")} accepted · ${byStatus(invites, "EXPIRED")} expired`,
      },
      { label: "Feedback unread", value: feedbackNew },
    ],
    signupsByWeek: bucketByWeek(
      real.map((u) => u.createdAt),
      OVERVIEW_WEEKS,
      now
    ),
    workoutsByWeek: bucketByWeek(completedAts, OVERVIEW_WEEKS, now),
  };
}

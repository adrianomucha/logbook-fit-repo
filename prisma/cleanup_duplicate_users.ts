// One-off cleanup for duplicate user rows created by repeated seed runs
// (seed.ts uses create, and prod was missing the users_email_active_unique
// partial index, so each run added a full new coach/client/demo generation).
//
// Keeps the OLDEST active row per email — verified 2026-06-12 to be the live
// generation: auth findFirst resolves to it, and all activity since March
// (messages, check-ins, workouts, plan edits) belongs to it. Newer duplicates
// are self-contained seed graphs with no cross-references to the live one.
//
// Soft-deletes only (sets deletedAt); FK references stay intact and the
// partial unique index ignores soft-deleted rows.
//
// Usage:
//   npx tsx prisma/cleanup_duplicate_users.ts            # dry run (default)
//   npx tsx prisma/cleanup_duplicate_users.ts --execute  # apply soft-deletes
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const execute = process.argv.includes("--execute");

type UserRow = {
  id: string;
  email: string;
  role: string;
  createdAt: Date;
};

async function describeUser(u: UserRow): Promise<string> {
  const [sent, received, coachProfile, clientProfile] = await Promise.all([
    prisma.message.count({ where: { senderId: u.id } }),
    prisma.message.count({ where: { recipientId: u.id } }),
    prisma.coachProfile.findUnique({ where: { userId: u.id }, select: { id: true } }),
    prisma.clientProfile.findUnique({ where: { userId: u.id }, select: { id: true } }),
  ]);

  const parts = [`messages=${sent + received}`];
  if (coachProfile) {
    const [plans, exercises, rels, checkIns] = await Promise.all([
      prisma.plan.count({ where: { coachId: coachProfile.id } }),
      prisma.exercise.count({ where: { coachId: coachProfile.id } }),
      prisma.coachClientRelationship.count({ where: { coachId: coachProfile.id } }),
      prisma.checkIn.count({ where: { coachId: coachProfile.id } }),
    ]);
    parts.push(`plans=${plans}`, `exercises=${exercises}`, `clients=${rels}`, `checkIns=${checkIns}`);
  }
  if (clientProfile) {
    const [workouts, checkIns] = await Promise.all([
      prisma.workoutCompletion.count({ where: { clientId: clientProfile.id } }),
      prisma.checkIn.count({ where: { clientId: clientProfile.id } }),
    ]);
    parts.push(`workouts=${workouts}`, `checkIns=${checkIns}`);
  }
  return parts.join(" ");
}

(async () => {
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true, role: true, createdAt: true },
  });

  const byEmail = new Map<string, UserRow[]>();
  for (const u of users) {
    const key = u.email.toLowerCase();
    byEmail.set(key, [...(byEmail.get(key) ?? []), u]);
  }

  const toDelete: UserRow[] = [];
  for (const [email, rows] of byEmail) {
    if (rows.length < 2) continue;
    const [keep, ...dupes] = rows;
    console.log(`\n${email}: ${rows.length} active rows`);
    console.log(`  KEEP   ${keep.id}  created ${keep.createdAt.toISOString()}  ${await describeUser(keep)}`);
    for (const d of dupes) {
      console.log(`  DELETE ${d.id}  created ${d.createdAt.toISOString()}  ${await describeUser(d)}`);
      toDelete.push(d);
    }
  }

  if (toDelete.length === 0) {
    console.log("No duplicate active users found. Nothing to do.");
    return;
  }

  if (!execute) {
    console.log(`\nDry run: ${toDelete.length} row(s) would be soft-deleted. Re-run with --execute to apply.`);
    return;
  }

  const res = await prisma.user.updateMany({
    where: { id: { in: toDelete.map((d) => d.id) }, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  console.log(`\nSoft-deleted ${res.count} duplicate user row(s).`);
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

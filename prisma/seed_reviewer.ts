/**
 * App Review accounts.
 *
 * App Store reviewers need to sign in to a working account on the API the
 * app actually ships against (production). The seeded demo accounts are
 * locked on every deployed build, so this creates a *real* coach + client
 * pair with enough going on to exercise every client screen: an assigned
 * plan in week 1, a pending check-in, an answered one in history, and a
 * chat thread with an unread message from the coach.
 *
 * Credentials come from the environment and are never written anywhere in
 * the repo — put them in App Store Connect's review notes only:
 *
 *   REVIEWER_COACH_EMAIL=review-coach@example.com \
 *   REVIEWER_CLIENT_EMAIL=review-client@example.com \
 *   REVIEWER_PASSWORD='<a long random password>' \
 *   npx tsx prisma/seed_reviewer.ts
 *
 * Re-running is safe: existing accounts are reused and their password is
 * reset to REVIEWER_PASSWORD (which is how you rotate it); the plan, check-ins
 * and messages are only created when missing.
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient, type ExerciseCategory } from "@prisma/client";
import { isDemoAccount } from "../src/lib/demo";
import { isCommonPassword } from "../src/lib/validations/schemas";

const prisma = new PrismaClient();

const COACH_EMAIL = process.env.REVIEWER_COACH_EMAIL?.trim().toLowerCase();
const CLIENT_EMAIL = process.env.REVIEWER_CLIENT_EMAIL?.trim().toLowerCase();
const PASSWORD = process.env.REVIEWER_PASSWORD;

const PLAN_NAME = "Foundations — 3 days";
const DURATION_WEEKS = 4;

type Ex = { name: string; category: ExerciseCategory; sets: number; reps: number; repsMax?: number; notes?: string };
type DayDef = { name: string; description: string; exercises: Ex[] };

const DAYS: DayDef[] = [
  {
    name: "Day 1 — Push",
    description: "Presses first while you're fresh. Leave two reps in the tank on every set.",
    exercises: [
      { name: "Barbell Bench Press", category: "CHEST", sets: 4, reps: 6, repsMax: 8 },
      { name: "Overhead Press", category: "SHOULDERS", sets: 3, reps: 8, repsMax: 10 },
      { name: "Incline Dumbbell Press", category: "CHEST", sets: 3, reps: 10, repsMax: 12 },
      { name: "Lateral Raise", category: "SHOULDERS", sets: 3, reps: 15, notes: "Light. Control the way down." },
      { name: "Triceps Pushdown", category: "TRICEPS", sets: 3, reps: 12 },
    ],
  },
  {
    name: "Day 2 — Pull",
    description: "Squeeze at the top of every row. Grip gives out before your back does — use straps if you need them.",
    exercises: [
      { name: "Deadlift", category: "BACK", sets: 3, reps: 5, notes: "Reset each rep. No touch-and-go." },
      { name: "Lat Pulldown", category: "BACK", sets: 3, reps: 8, repsMax: 10 },
      { name: "Seated Cable Row", category: "BACK", sets: 3, reps: 10, repsMax: 12 },
      { name: "Face Pull", category: "SHOULDERS", sets: 3, reps: 15 },
      { name: "Dumbbell Curl", category: "BICEPS", sets: 3, reps: 12 },
    ],
  },
  {
    name: "Day 3 — Legs",
    description: "The hard one. Warm up properly and take the full rest between squat sets.",
    exercises: [
      { name: "Back Squat", category: "LEGS", sets: 4, reps: 6, repsMax: 8 },
      { name: "Romanian Deadlift", category: "LEGS", sets: 3, reps: 8, repsMax: 10 },
      { name: "Leg Press", category: "LEGS", sets: 3, reps: 12 },
      { name: "Walking Lunge", category: "GLUTES", sets: 2, reps: 20, notes: "20 steps total." },
      { name: "Plank", category: "CORE", sets: 3, reps: 45, notes: "45 seconds per set." },
    ],
  },
];

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

async function ensureUser(email: string, name: string, role: "COACH" | "CLIENT", passwordHash: string) {
  const existing = await prisma.user.findFirst({ where: { email, deletedAt: null } });
  if (existing) {
    if (existing.role !== role) {
      throw new Error(`${email} exists with role ${existing.role}, expected ${role}`);
    }
    await prisma.user.update({ where: { id: existing.id }, data: { passwordHash } });
    console.log(`✓ ${role} exists, password reset: ${email}`);
    return existing;
  }
  const user = await prisma.user.create({ data: { email, name, role, passwordHash } });
  console.log(`✓ ${role} created: ${email}`);
  return user;
}

async function main() {
  if (!COACH_EMAIL || !CLIENT_EMAIL || !PASSWORD) {
    throw new Error(
      "Set REVIEWER_COACH_EMAIL, REVIEWER_CLIENT_EMAIL and REVIEWER_PASSWORD in the environment."
    );
  }
  if (isDemoAccount(COACH_EMAIL) || isDemoAccount(CLIENT_EMAIL)) {
    throw new Error("Reviewer accounts must not reuse the seeded demo emails — those are locked on deployed builds.");
  }
  if (PASSWORD.length < 12 || isCommonPassword(PASSWORD)) {
    throw new Error("REVIEWER_PASSWORD must be at least 12 characters and not a common password.");
  }
  if (COACH_EMAIL === CLIENT_EMAIL) {
    throw new Error("Coach and client need different emails.");
  }

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  // 1. Coach
  const coachUser = await ensureUser(COACH_EMAIL, "Casey Reviewer (Coach)", "COACH", passwordHash);
  const coachProfile = await prisma.coachProfile.upsert({
    where: { userId: coachUser.id },
    create: { userId: coachUser.id, bio: "App Review coach account." },
    update: {},
  });

  // 2. Client
  const clientUser = await ensureUser(CLIENT_EMAIL, "Sam Reviewer (Client)", "CLIENT", passwordHash);
  const clientProfile = await prisma.clientProfile.upsert({
    where: { userId: clientUser.id },
    create: { userId: clientUser.id },
    update: {},
  });

  // 3. Relationship (one coach per client — reuse whatever exists)
  const relationship = await prisma.coachClientRelationship.upsert({
    where: { clientId: clientProfile.id },
    create: { coachId: coachProfile.id, clientId: clientProfile.id, status: "ACTIVE" },
    update: { coachId: coachProfile.id, status: "ACTIVE", endedAt: null, endedBy: null },
  });
  console.log(`✓ Relationship ${relationship.status}`);

  // 4. Exercises (reuse by name) and plan
  const exerciseIdByName = new Map<string, string>();
  for (const day of DAYS) {
    for (const ex of day.exercises) {
      if (exerciseIdByName.has(ex.name)) continue;
      const found = await prisma.exercise.findFirst({
        where: { coachId: coachProfile.id, name: ex.name, deletedAt: null },
      });
      const rec =
        found ??
        (await prisma.exercise.create({
          data: {
            coachId: coachProfile.id,
            name: ex.name,
            category: ex.category,
            defaultSets: ex.sets,
            defaultReps: ex.reps,
          },
        }));
      exerciseIdByName.set(ex.name, rec.id);
    }
  }

  let plan = await prisma.plan.findFirst({
    where: { coachId: coachProfile.id, name: PLAN_NAME, deletedAt: null, sourceTemplateId: null },
  });
  if (!plan) {
    plan = await prisma.plan.create({
      data: {
        coachId: coachProfile.id,
        name: PLAN_NAME,
        description: "A three-day full-body split for the first month. Add a little weight each week when every set hits the top of its range.",
        durationWeeks: DURATION_WEEKS,
        workoutsPerWeek: DAYS.length,
      },
    });
    for (let w = 1; w <= DURATION_WEEKS; w++) {
      const week = await prisma.week.create({ data: { planId: plan.id, weekNumber: w } });
      for (let d = 0; d < DAYS.length; d++) {
        const day = await prisma.day.create({
          data: { weekId: week.id, orderIndex: d + 1, name: DAYS[d].name, description: DAYS[d].description },
        });
        await prisma.workoutExercise.createMany({
          data: DAYS[d].exercises.map((ex, i) => ({
            dayId: day.id,
            exerciseId: exerciseIdByName.get(ex.name)!,
            orderIndex: i + 1,
            sets: ex.sets,
            reps: ex.reps,
            repsMax: ex.repsMax,
            coachNotes: ex.notes,
          })),
        });
      }
    }
    console.log(`✓ Plan created: ${PLAN_NAME}`);
  } else {
    console.log(`✓ Plan exists: ${PLAN_NAME}`);
  }

  // 5. Assign — week 1 starts today, so the reviewer sees a fresh week
  if (clientProfile.activePlanId !== plan.id) {
    await prisma.clientProfile.update({
      where: { id: clientProfile.id },
      data: { activePlanId: plan.id, planStartDate: new Date() },
    });
    console.log("✓ Plan assigned (starts today)");
  }

  // 6. Check-ins: one answered and replied to (history), one waiting (the card)
  const answered = await prisma.checkIn.findFirst({
    where: { coachId: coachProfile.id, clientId: clientProfile.id, status: "COMPLETED" },
  });
  if (!answered) {
    await prisma.checkIn.create({
      data: {
        coachId: coachProfile.id,
        clientId: clientProfile.id,
        status: "COMPLETED",
        effortRating: "MEDIUM",
        clientFeeling: "Good week. Squats felt heavy on the last set but nothing hurt.",
        painBlockers: null,
        clientRespondedAt: daysAgo(6),
        coachFeedback: "That's exactly where the last set should feel. Keep the weight the same this week and aim for the top of the range.",
        planAdjustment: false,
        coachRespondedAt: daysAgo(6),
        completedAt: daysAgo(6),
        createdAt: daysAgo(7),
      },
    });
  }
  const pending = await prisma.checkIn.findFirst({
    where: { coachId: coachProfile.id, clientId: clientProfile.id, status: "PENDING" },
  });
  if (!pending) {
    await prisma.checkIn.create({
      data: { coachId: coachProfile.id, clientId: clientProfile.id, status: "PENDING" },
    });
  }
  console.log("✓ Check-ins: one in history, one waiting");

  // 7. Chat: a short thread, last message from the coach and unread
  const threadCount = await prisma.message.count({
    where: {
      OR: [
        { senderId: coachUser.id, recipientId: clientUser.id },
        { senderId: clientUser.id, recipientId: coachUser.id },
      ],
    },
  });
  if (threadCount === 0) {
    await prisma.message.createMany({
      data: [
        {
          senderId: coachUser.id,
          recipientId: clientUser.id,
          content: "Welcome aboard! Your first block is up — three days a week, nothing fancy. Start whenever you're ready.",
          readAt: daysAgo(2),
          createdAt: daysAgo(3),
        },
        {
          senderId: clientUser.id,
          recipientId: coachUser.id,
          content: "Thanks! Planning to start Monday.",
          readAt: daysAgo(2),
          createdAt: daysAgo(2),
        },
        {
          senderId: coachUser.id,
          recipientId: clientUser.id,
          content: "Perfect. Flag anything that doesn't feel right during a session and I'll take a look.",
          readAt: null,
          createdAt: daysAgo(1),
        },
      ],
    });
  }
  console.log("✓ Chat thread ready");

  console.log("\nReviewer accounts ready. Put the emails and password in App Store Connect → App Review Information only.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

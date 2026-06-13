/**
 * One-off seed: imports Adrian's "Hypertrophy 1.1" tracker (4-day split, 8 weeks)
 * from the spreadsheet into the app as a Plan owned by coach@logbook.fit and
 * assigns it to client Adrian (adrianomucha@gmail.com) as the active plan.
 *
 * Run: npx tsx prisma/seed_adrian_plan.ts
 * Safe to inspect before running; aborts if a plan with the same name already exists.
 */
import "dotenv/config";
import { PrismaClient, ExerciseCategory } from "@prisma/client";

const prisma = new PrismaClient();

const COACH_EMAIL = "coach@logbook.fit";
const CLIENT_EMAIL = "adrianomucha@gmail.com";
const PLAN_NAME = "Adrian — Hypertrophy 1.1";
const DURATION_WEEKS = 8;

type Ex = {
  name: string;
  category: ExerciseCategory;
  sets: number;
  reps: number;
  notes: string | null;
};

type DayDef = { name: string; description: string; exercises: Ex[] };

const DAYS: DayDef[] = [
  {
    name: "Day 1 — Chest + Lats (Posture Focus)",
    description:
      "Chest and lat work with a posture/serratus focus. Double progression on the presses — add reps to the top of the range, then add a little weight.",
    exercises: [
      { name: "Chest & shoulders pre-push stretch", category: "OTHER", sets: 1, reps: 1, notes: "Warm-up — mobility prep before pressing." },
      { name: "Wall flexor stretch", category: "OTHER", sets: 2, reps: 10, notes: "Wrist prep." },
      { name: "Incline cable fly", category: "CHEST", sets: 2, reps: 12, notes: "12–15 reps — peak contraction." },
      { name: "Incline barbell / Smith press", category: "CHEST", sets: 4, reps: 6, notes: "6–8 reps — heavy. New (was incline DB press)." },
      { name: "V-bar lat pulldown", category: "BACK", sets: 4, reps: 10, notes: null },
      { name: "Chest-supported rows", category: "BACK", sets: 3, reps: 12, notes: null },
      { name: "Pec deck / machine fly", category: "CHEST", sets: 3, reps: 12, notes: "New (was low cable crossover)." },
      { name: "Face pull", category: "SHOULDERS", sets: 3, reps: 15, notes: null },
      { name: "Banded serratus wall slides", category: "SHOULDERS", sets: 2, reps: 15, notes: null },
      { name: "Dead bug crunch", category: "CORE", sets: 3, reps: 12, notes: null },
    ],
  },
  {
    name: "Day 2 — Legs + Glutes + Core (No Wrist Overload)",
    description:
      "Lower body and core chosen to avoid wrist loading. Log time for planks and stretches.",
    exercises: [
      { name: "RDLs (dumbbell)", category: "LEGS", sets: 4, reps: 8, notes: "Palms neutral." },
      { name: "Hack squat / leg press", category: "LEGS", sets: 4, reps: 10, notes: "10–12 reps — quad focus. New (was Bulgarian split squat)." },
      { name: "Barbell hip thrust", category: "GLUTES", sets: 4, reps: 10, notes: null },
      { name: "Lying leg curl", category: "LEGS", sets: 3, reps: 12, notes: "New (was seated hamstring curl)." },
      { name: "Calf raise on step", category: "LEGS", sets: 4, reps: 12, notes: "Peak contraction at top." },
      { name: "Plank", category: "CORE", sets: 3, reps: 1, notes: "30–60s hold — scapular protraction. Log time." },
      { name: "Side plank", category: "CORE", sets: 2, reps: 1, notes: "30s each side. Log time." },
      { name: "Pallof press", category: "CORE", sets: 3, reps: 12, notes: null },
      { name: "Quads stretch", category: "OTHER", sets: 1, reps: 1, notes: "1 min hold." },
    ],
  },
  {
    name: "Day 3 — Back Width + Biceps",
    description: "Vertical pulling for back width plus direct biceps work.",
    exercises: [
      { name: "Wide-grip lat pulldown", category: "BACK", sets: 4, reps: 8, notes: "8–10 reps. New (was Gravitron wide pull-up)." },
      { name: "One-arm pulldown", category: "BACK", sets: 3, reps: 10, notes: null },
      { name: "Low row (palm-down grip)", category: "BACK", sets: 3, reps: 12, notes: "Mid-back focus." },
      { name: "Preacher curl", category: "BICEPS", sets: 3, reps: 10, notes: "10–12 reps. New (was incline DB curl)." },
      { name: "Dumbbell hammer curl", category: "BICEPS", sets: 3, reps: 12, notes: null },
      { name: "Face pull w/ external rotations", category: "SHOULDERS", sets: 3, reps: 15, notes: null },
    ],
  },
  {
    name: "Day 4 — Chest + Shoulders Stability + Triceps",
    description: "Shoulder-focused day with chest, side-delt volume, and triceps.",
    exercises: [
      { name: "Dumbbell press", category: "CHEST", sets: 4, reps: 8, notes: "Heavy." },
      { name: "Seated DB / machine shoulder press", category: "SHOULDERS", sets: 4, reps: 8, notes: "8–10 reps. New (was chest press machine)." },
      { name: "Cable lateral raises", category: "SHOULDERS", sets: 4, reps: 15, notes: "Side delts — volume bumped to 4×15 (was 3×15)." },
      { name: "Reverse fly machine", category: "SHOULDERS", sets: 3, reps: 15, notes: null },
      { name: "Triceps pushdown w/ rope", category: "TRICEPS", sets: 3, reps: 12, notes: null },
      { name: "EZ-bar / DB skull crushers", category: "TRICEPS", sets: 3, reps: 10, notes: "10–12 reps. New (was cable overhead extension)." },
      { name: "Face pull w/ external rotations", category: "SHOULDERS", sets: 2, reps: 20, notes: null },
    ],
  },
];

async function main() {
  // 1. Resolve coach + client
  const coachUser = await prisma.user.findFirst({
    where: { email: COACH_EMAIL, deletedAt: null },
    include: { coachProfile: true },
  });
  if (!coachUser?.coachProfile) throw new Error(`Coach not found: ${COACH_EMAIL}`);
  const coachId = coachUser.coachProfile.id;

  const clientUser = await prisma.user.findFirst({
    where: { email: CLIENT_EMAIL, deletedAt: null },
    include: { clientProfile: true },
  });
  if (!clientUser?.clientProfile) throw new Error(`Client not found: ${CLIENT_EMAIL}`);
  const clientProfileId = clientUser.clientProfile.id;

  // 2. Guard against duplicate runs
  const existing = await prisma.plan.findFirst({
    where: { coachId, name: PLAN_NAME, deletedAt: null },
  });
  if (existing) {
    throw new Error(
      `A plan named "${PLAN_NAME}" already exists (id=${existing.id}). Delete it first or rename, then re-run.`
    );
  }

  // 3. Upsert exercise library (reuse by name for this coach, else create)
  const uniqueExercises = new Map<string, Ex>();
  for (const day of DAYS) {
    for (const ex of day.exercises) {
      if (!uniqueExercises.has(ex.name)) uniqueExercises.set(ex.name, ex);
    }
  }

  const exerciseIdByName = new Map<string, string>();
  let created = 0;
  let reused = 0;
  for (const ex of uniqueExercises.values()) {
    const found = await prisma.exercise.findFirst({
      where: { coachId, name: ex.name, deletedAt: null },
    });
    if (found) {
      exerciseIdByName.set(ex.name, found.id);
      reused++;
    } else {
      const rec = await prisma.exercise.create({
        data: {
          coachId,
          name: ex.name,
          category: ex.category,
          defaultSets: ex.sets,
          defaultReps: ex.reps,
          instructions: ex.notes ?? undefined,
        },
      });
      exerciseIdByName.set(ex.name, rec.id);
      created++;
    }
  }
  console.log(`Exercises: ${created} created, ${reused} reused (${uniqueExercises.size} unique).`);

  // 4. Create plan with 8 identical weeks × 4 days × exercises
  const plan = await prisma.plan.create({
    data: {
      coachId,
      name: PLAN_NAME,
      description:
        "4-day hypertrophy split (revised v1.1). Double progression: start at the bottom of each rep range, add reps weekly to the top, then add a little weight and repeat. Leave 1–2 reps in the tank. Log time for planks and stretches.",
      emoji: "💪",
      durationWeeks: DURATION_WEEKS,
      workoutsPerWeek: DAYS.length,
    },
  });

  let weStmts = 0;
  for (let w = 1; w <= DURATION_WEEKS; w++) {
    const week = await prisma.week.create({
      data: { planId: plan.id, weekNumber: w },
    });
    for (let d = 0; d < DAYS.length; d++) {
      const dayDef = DAYS[d];
      const day = await prisma.day.create({
        data: {
          weekId: week.id,
          orderIndex: d + 1,
          name: dayDef.name,
          description: dayDef.description,
        },
      });
      await prisma.workoutExercise.createMany({
        data: dayDef.exercises.map((ex, i) => ({
          dayId: day.id,
          exerciseId: exerciseIdByName.get(ex.name)!,
          orderIndex: i + 1,
          sets: ex.sets,
          reps: ex.reps,
          coachNotes: ex.notes ?? undefined,
        })),
      });
      weStmts += dayDef.exercises.length;
    }
  }
  console.log(`Plan created: ${plan.id} — ${DURATION_WEEKS} weeks × ${DAYS.length} days, ${weStmts} workout-exercise rows.`);

  // 5. Assign as Adrian's active plan, starting today
  await prisma.clientProfile.update({
    where: { id: clientProfileId },
    data: { activePlanId: plan.id, planStartDate: new Date() },
  });
  console.log(`Assigned plan ${plan.id} to client ${CLIENT_EMAIL} as active (start = today).`);
}

main()
  .then(() => console.log("Done."))
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

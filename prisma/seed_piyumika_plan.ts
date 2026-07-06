/**
 * One-off seed: imports Piyumika's "4 week Metabolic Reset" routine (4-day split,
 * 4 weeks, fat reduction / hypertrophy, intermediate) from her coach's PDF into
 * the app as a Plan owned by coach@logbook.fit and assigns it to client
 * Piyumika de Silva (piyumika@demo.logbook.fit) as the active plan.
 *
 * Days 5-7 of the source routine (LISS cardio / optional recovery / full rest)
 * carry no prescribed exercises, so only the 4 training days are modeled —
 * rest days are implicit in the app's plan structure.
 *
 * Run: npx tsx prisma/seed_piyumika_plan.ts
 * Safe to inspect before running; aborts if a plan with the same name already exists.
 */
import "dotenv/config";
import { PrismaClient, ExerciseCategory } from "@prisma/client";

const prisma = new PrismaClient();

const COACH_EMAIL = "coach@logbook.fit";
const CLIENT_EMAIL = "piyumika@demo.logbook.fit";
const PLAN_NAME = "4 week Metabolic Reset";
const DURATION_WEEKS = 4;

type Ex = {
  name: string;
  category: ExerciseCategory;
  sets: number;
  reps: number;
  weight?: number; // kg
  rest?: number; // seconds
  notes?: string;
};

type DayDef = { name: string; description: string; exercises: Ex[] };

const DAYS: DayDef[] = [
  {
    name: "Glutes + Posterior Chain",
    description:
      "Bike warm-up, then glute/posterior-chain supersets. Alternate the exercises inside each combined block.",
    exercises: [
      { name: "Seated Spinning Bike", category: "CARDIO", sets: 1, reps: 1, notes: "15 minutes — keep BPM at 120–130. Log time." },
      { name: "Banded Fire Hydrant", category: "GLUTES", sets: 2, reps: 12, rest: 30, notes: "Superset with Pulse Squat and Hip CARs. Block substitute: Glute Bridge with Rubber Band 2×15 @ 50kg, 30s rest." },
      { name: "Pulse Squat", category: "LEGS", sets: 2, reps: 1, notes: "30s of pulses per set. Superset with Banded Fire Hydrant and Hip CARs." },
      { name: "Hip CARs", category: "OTHER", sets: 2, reps: 8, notes: "8 each side. Superset with Banded Fire Hydrant and Pulse Squat." },
      { name: "RDLs (dumbbell)", category: "LEGS", sets: 4, reps: 10, weight: 60, rest: 60, notes: "3s eccentric. 60kg total. Superset with Seated Hip Abduction." },
      { name: "Seated Hip Abduction with Rubber Band", category: "GLUTES", sets: 4, reps: 20, weight: 70, notes: "Superset with RDLs." },
      { name: "Barbell Hip Thrust", category: "GLUTES", sets: 4, reps: 12, weight: 50, rest: 75, notes: "Pause 2s at the top. Superset with Dumbbell Reverse Lunge." },
      { name: "Dumbbell Reverse Lunge", category: "LEGS", sets: 3, reps: 10, weight: 15, notes: "Superset with Barbell Hip Thrust." },
      { name: "Swiss Ball Hamstring Curl", category: "LEGS", sets: 3, reps: 15, rest: 60, notes: "Superset with DB Goblet Form." },
      { name: "DB Goblet Form", category: "LEGS", sets: 3, reps: 12, notes: "Superset with Swiss Ball Hamstring Curl. Substitute: Frog Pumps 2×20, 40s rest." },
      { name: "Kettlebell Sumo Squat", category: "LEGS", sets: 3, reps: 15, rest: 50, notes: "2–3 rounds — circuit with Step Squat and One-Leg Glute Bridge." },
      { name: "Step Squat", category: "LEGS", sets: 3, reps: 12, notes: "12 per leg — circuit." },
      { name: "One-Leg Glute Bridge", category: "GLUTES", sets: 3, reps: 20, notes: "Circuit finisher." },
    ],
  },
  {
    name: "Upper Body Strength + Core Tightener",
    description:
      "Scapular activation, then upper-body supersets and a core block. Finish with incline treadmill cardio.",
    exercises: [
      { name: "Wall Slides", category: "SHOULDERS", sets: 2, reps: 10, rest: 30, notes: "Activation superset with Band Pull Aparts and Wall Scapular Push Up." },
      { name: "Band Pull Aparts", category: "SHOULDERS", sets: 2, reps: 15, rest: 30, notes: "Activation superset." },
      { name: "Wall Scapular Push Up", category: "SHOULDERS", sets: 2, reps: 10, rest: 30, notes: "Activation superset." },
      { name: "Wide-Grip Lat Pulldown", category: "BACK", sets: 4, reps: 10, weight: 55, rest: 60, notes: "Superset with Incline Dumbbell Press." },
      { name: "Incline Dumbbell Press", category: "CHEST", sets: 4, reps: 10, weight: 20, notes: "Superset with Wide-Grip Lat Pulldown." },
      { name: "V-Bar Low Row", category: "BACK", sets: 3, reps: 12, weight: 55, rest: 60, notes: "Superset with Dumbbell Side Lateral Raise." },
      { name: "Dumbbell Side Lateral Raise", category: "SHOULDERS", sets: 3, reps: 12, weight: 7.5, notes: "Superset with V-Bar Low Row." },
      { name: "Low Cable Bicep Curl with Rope", category: "BICEPS", sets: 3, reps: 15, weight: 27, rest: 45, notes: "Superset with Rope Cable Pulldown." },
      { name: "Rope Cable Pulldown", category: "TRICEPS", sets: 3, reps: 15, weight: 20, notes: "Superset with Low Cable Bicep Curl." },
      { name: "Plank", category: "CORE", sets: 3, reps: 1, rest: 45, notes: "45s hold per round. Superset with shoulder press and climbing crunch. Log time." },
      { name: "Neutral-Grip Dumbbell Shoulder Press", category: "SHOULDERS", sets: 3, reps: 12, weight: 12.5, notes: "Core superset block." },
      { name: "Climbing Crunch on Slide", category: "CORE", sets: 3, reps: 1, notes: "40s per set. Log time." },
      { name: "Treadmill with Incline", category: "CARDIO", sets: 1, reps: 1, notes: "35 minutes @ 130–140 BPM. Log time." },
    ],
  },
  {
    name: "Cardio + Core + Recovery",
    description:
      "Incline treadmill session, light core work, and mobility / stretching for recovery.",
    exercises: [
      { name: "Treadmill with Incline", category: "CARDIO", sets: 1, reps: 1, notes: "30 minutes — 5 min walking @ 110 BPM, 20 min @ 130–140, 5 min cool-down. Log time." },
      { name: "Alternating Pointer", category: "CORE", sets: 2, reps: 12 },
      { name: "Dead Bug Crunch", category: "CORE", sets: 2, reps: 10 },
      { name: "Dynamic Hip Mobility", category: "OTHER", sets: 2, reps: 1, notes: "30s per set." },
      { name: "Spine Stretch III", category: "OTHER", sets: 2, reps: 1, notes: "30s per set." },
      { name: "Supine Twist", category: "OTHER", sets: 2, reps: 1, notes: "30s per set." },
      { name: "Hip Flexor Stretch", category: "OTHER", sets: 2, reps: 10 },
      { name: "Thoracic Spine Rotations", category: "OTHER", sets: 2, reps: 10 },
      { name: "Thoracic Mobility X", category: "OTHER", sets: 2, reps: 12 },
    ],
  },
  {
    name: "Full Body Strength + Core Shed",
    description:
      "Ankle/hip mobility prep, then lower-body strength, full-body work, and a glute finisher.",
    exercises: [
      { name: "Ankle Mobility", category: "OTHER", sets: 1, reps: 15, notes: "Each side. Superset with Half Kneeling Ankle Mobility." },
      { name: "Half Kneeling Ankle Mobility", category: "OTHER", sets: 1, reps: 15, notes: "With hold. Superset with Ankle Mobility." },
      { name: "Hip CARs", category: "OTHER", sets: 1, reps: 15, notes: "Each side, nice and controlled. Superset with One-Leg Glute Bridge and Banded Lateral Walk." },
      { name: "One-Leg Glute Bridge", category: "GLUTES", sets: 2, reps: 10, notes: "Each leg, with pulse. Activation superset." },
      { name: "Banded Lateral Walk", category: "GLUTES", sets: 1, reps: 20, rest: 30, notes: "Activation superset." },
      { name: "Leg Press", category: "LEGS", sets: 4, reps: 10, weight: 110, rest: 75, notes: "Heels high." },
      { name: "Bulgarian Split Squat", category: "LEGS", sets: 3, reps: 10, weight: 25, rest: 75, notes: "With dumbbell. Substitute: One-Legged Cable Kickback 3×12 @ 12.5kg, 60s rest." },
      { name: "DB Goblet Form", category: "LEGS", sets: 3, reps: 12, weight: 50, rest: 60 },
      { name: "Squat with Shoulder Press", category: "FULL_BODY", sets: 3, reps: 12, weight: 15, rest: 60, notes: "Dumbbell on the floor between reps." },
      { name: "Smith Machine Push Up", category: "CHEST", sets: 3, reps: 12, rest: 45 },
      { name: "Hip Thrust on Floor", category: "GLUTES", sets: 2, reps: 20, rest: 45, notes: "Superset with Frog Pumps." },
      { name: "Frog Pumps", category: "GLUTES", sets: 2, reps: 20, notes: "Superset with Hip Thrust on Floor." },
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

  // 3. Upsert exercise library (reuse by name, case-insensitive, else create)
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
      where: { coachId, name: { equals: ex.name, mode: "insensitive" }, deletedAt: null },
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
        },
      });
      exerciseIdByName.set(ex.name, rec.id);
      created++;
    }
  }
  console.log(`Exercises: ${created} created, ${reused} reused (${uniqueExercises.size} unique).`);

  // 4. Create plan with 4 identical weeks × 4 days × exercises
  const plan = await prisma.plan.create({
    data: {
      coachId,
      name: PLAN_NAME,
      description:
        "Fat reduction / hypertrophy program (intermediate). 4 training days per week: glutes + posterior chain, upper body + core, cardio + core + recovery, and full body + core shed. Remaining days: LISS cardio, optional recovery, and full rest. Combined blocks are supersets — alternate the exercises within a block.",
      emoji: "🔥",
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
          weight: ex.weight,
          restSeconds: ex.rest,
          coachNotes: ex.notes,
        })),
      });
      weStmts += dayDef.exercises.length;
    }
  }
  console.log(`Plan created: ${plan.id} — ${DURATION_WEEKS} weeks × ${DAYS.length} days, ${weStmts} workout-exercise rows.`);

  // 5. Assign as Piyumika's active plan, starting today
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

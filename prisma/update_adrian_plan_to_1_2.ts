/**
 * One-off update: revises Adrian's plan from "Hypertrophy 1.1" to "Hypertrophy 1.2"
 * per the Adrian_Hypertrophy_1.2_Tracker spreadsheet.
 *
 * What changed in 1.2:
 *  - Day 1 reordered — all three chest movements come first (press while freshest),
 *    then lats. Dead bug crunch → cable crunch (loaded, trackable).
 *  - Day 2: planks → weighted/loaded versions with time tracking (progressable),
 *    lying leg curl → seated hamstring curl.
 *  - Rep ranges are now stored properly (reps/repsMax) and timed holds use
 *    trackingType TIME with seconds in reps/repsMax.
 *
 * Behavior: days that already have a WorkoutCompletion (started or finished) are
 * left untouched so logged history is preserved; every untouched day is rewritten
 * to the 1.2 spec. Re-runnable — picks the plan up by its 1.1 or 1.2 name.
 *
 * Run: npx tsx prisma/update_adrian_plan_to_1_2.ts
 */
import "dotenv/config";
import { PrismaClient, ExerciseCategory, TrackingType } from "@prisma/client";

const prisma = new PrismaClient();

const COACH_EMAIL = "coach@logbook.fit";
const OLD_PLAN_NAME = "Adrian — Hypertrophy 1.1";
const NEW_PLAN_NAME = "Adrian — Hypertrophy 1.2";

type Ex = {
  name: string;
  category: ExerciseCategory;
  trackingType?: TrackingType; // defaults to REPS
  sets: number;
  reps: number; // seconds when trackingType is TIME
  repsMax?: number; // upper bound of the range (seconds when TIME)
  notes: string | null;
};

type DayDef = { name: string; description: string; exercises: Ex[] };

const DAYS: DayDef[] = [
  {
    name: "Day 1 — Chest + Lats (Posture Focus)",
    description:
      "Chest first while fresh — all three chest movements before lats (v1.2 reorder). Double progression on the press: add 1–2 kg once you hit the top of the range on all sets.",
    exercises: [
      { name: "Chest & shoulders pre-push stretch", category: "OTHER", sets: 1, reps: 1, notes: "Warm-up — prep the shoulder before pressing." },
      { name: "Wall flexor stretch", category: "OTHER", sets: 2, reps: 10, notes: "Prehab — wrist prep." },
      { name: "Incline barbell / Smith press", category: "CHEST", sets: 4, reps: 6, repsMax: 8, notes: "Moved first — heaviest chest press while fresh. +1–2 kg when you hit 8 on all sets." },
      { name: "Incline cable fly", category: "CHEST", sets: 2, reps: 12, repsMax: 15, notes: "Now after the press — peak contraction." },
      { name: "Pec deck / machine fly", category: "CHEST", sets: 3, reps: 12, notes: "Chest grouped up front (was buried at #7)." },
      { name: "V-bar lat pulldown", category: "BACK", sets: 4, reps: 10, notes: "Lats." },
      { name: "Chest-supported rows", category: "BACK", sets: 3, reps: 12, notes: "Mid-back / posture." },
      { name: "Face pull", category: "SHOULDERS", sets: 3, reps: 15, notes: "Posture." },
      { name: "Banded serratus wall slides", category: "SHOULDERS", sets: 2, reps: 15, notes: "Scapular health." },
      // "Cable Crunch" (capital C) matches the coach's existing library entry
      { name: "Cable Crunch", category: "CORE", sets: 3, reps: 12, notes: "Loaded core (was dead bug crunch) — add weight when 12 is easy." },
    ],
  },
  {
    name: "Day 2 — Legs + Glutes + Core (No Wrist Overload)",
    description:
      "Lower body and core with no wrist loading. Core work is now loaded and progressable (v1.2) — log the plate/DB weight on planks instead of just the time.",
    exercises: [
      { name: "RDLs (dumbbell)", category: "LEGS", sets: 4, reps: 8, notes: "Neutral grip — no wrist load." },
      { name: "Hack squat / leg press", category: "LEGS", sets: 4, reps: 10, repsMax: 12, notes: "Direct quad loading." },
      { name: "Barbell hip thrust", category: "GLUTES", sets: 4, reps: 10, notes: "Glutes." },
      { name: "Seated hamstring curl", category: "LEGS", sets: 3, reps: 12, notes: null },
      { name: "Calf raise on step", category: "LEGS", sets: 4, reps: 12, notes: "Peak contraction at top." },
      { name: "Weighted plank", category: "CORE", trackingType: "TIME", sets: 3, reps: 30, repsMax: 45, notes: "Loaded core (was bodyweight plank) — plate on back; log the plate weight." },
      { name: "Weighted / Copenhagen side plank", category: "CORE", trackingType: "TIME", sets: 3, reps: 20, repsMax: 30, notes: "Loaded core — hold a DB or progress the lever. 20–30s each side." },
      { name: "Pallof press", category: "CORE", sets: 3, reps: 12, notes: "Progress the cable stack each week." },
      { name: "Quads stretch", category: "OTHER", trackingType: "TIME", sets: 1, reps: 60, notes: "Cooldown — 1 min hold." },
    ],
  },
  {
    name: "Day 3 — Back Width + Biceps",
    description: "Vertical pulling for back width plus direct biceps work.",
    exercises: [
      { name: "Wide-grip lat pulldown", category: "BACK", sets: 4, reps: 8, repsMax: 10, notes: "Width." },
      { name: "One-arm pulldown", category: "BACK", sets: 3, reps: 10, notes: null },
      { name: "Low row (palm-down grip)", category: "BACK", sets: 3, reps: 12, notes: "Mid-back focus." },
      { name: "Preacher curl", category: "BICEPS", sets: 3, reps: 12, notes: "Stretch-biased biceps." },
      { name: "Dumbbell hammer curl", category: "BICEPS", sets: 3, reps: 12, notes: "Brachialis." },
      { name: "Face pull w/ external rotations", category: "SHOULDERS", sets: 3, reps: 15, notes: "Posture." },
    ],
  },
  {
    name: "Day 4 — Chest + Shoulders Stability + Triceps",
    description: "Shoulder-focused day with chest, side-delt volume, and triceps.",
    exercises: [
      { name: "Dumbbell press", category: "CHEST", sets: 4, reps: 8, notes: "Chest — already your opener; press it hard." },
      { name: "Seated DB / machine shoulder press", category: "SHOULDERS", sets: 4, reps: 8, repsMax: 10, notes: "Makes this a true shoulder day." },
      { name: "Cable lateral raises", category: "SHOULDERS", sets: 4, reps: 15, notes: "Side-delt volume." },
      { name: "Reverse fly machine", category: "SHOULDERS", sets: 3, reps: 15, notes: "Rear delt / posture." },
      { name: "Triceps pushdown w/ rope", category: "TRICEPS", sets: 3, reps: 12, notes: null },
      { name: "EZ-bar / DB skull crushers", category: "TRICEPS", sets: 3, reps: 12, notes: "Loaded triceps stretch." },
      { name: "Face pull w/ external rotations", category: "SHOULDERS", sets: 2, reps: 20, notes: "Posture." },
    ],
  },
];

async function main() {
  // 1. Resolve coach + plan (by old name, or new name if this script already ran)
  const coachUser = await prisma.user.findFirst({
    where: { email: COACH_EMAIL, deletedAt: null },
    include: { coachProfile: true },
  });
  if (!coachUser?.coachProfile) throw new Error(`Coach not found: ${COACH_EMAIL}`);
  const coachId = coachUser.coachProfile.id;

  const plan = await prisma.plan.findFirst({
    where: { coachId, name: { in: [OLD_PLAN_NAME, NEW_PLAN_NAME] }, deletedAt: null },
    include: { weeks: { include: { days: true }, orderBy: { weekNumber: "asc" } } },
  });
  if (!plan) throw new Error(`Plan not found: "${OLD_PLAN_NAME}" (or "${NEW_PLAN_NAME}")`);
  console.log(`Updating plan ${plan.id} ("${plan.name}") → "${NEW_PLAN_NAME}".`);

  // 2. Upsert exercise library (reuse by name for this coach, else create)
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
          trackingType: ex.trackingType ?? "REPS",
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

  // 3. Rewrite every day the client hasn't started yet; leave logged days as history
  let rewritten = 0;
  let skipped = 0;
  for (const week of plan.weeks) {
    for (const day of week.days) {
      const dayDef = DAYS[day.orderIndex - 1];
      if (!dayDef) {
        console.warn(`Week ${week.weekNumber} day orderIndex=${day.orderIndex} has no 1.2 definition — skipped.`);
        continue;
      }

      const touched = await prisma.workoutCompletion.findFirst({
        where: { dayId: day.id },
        select: { id: true },
      });
      if (touched) {
        skipped++;
        continue;
      }

      await prisma.$transaction([
        prisma.day.update({
          where: { id: day.id },
          data: { name: dayDef.name, description: dayDef.description },
        }),
        prisma.workoutExercise.deleteMany({ where: { dayId: day.id } }),
        prisma.workoutExercise.createMany({
          data: dayDef.exercises.map((ex, i) => ({
            dayId: day.id,
            exerciseId: exerciseIdByName.get(ex.name)!,
            orderIndex: i + 1,
            trackingType: ex.trackingType ?? "REPS",
            sets: ex.sets,
            reps: ex.reps,
            repsMax: ex.repsMax ?? undefined,
            coachNotes: ex.notes ?? undefined,
          })),
        }),
      ]);
      rewritten++;
    }
  }
  console.log(`Days: ${rewritten} rewritten to v1.2, ${skipped} left untouched (already logged).`);

  // 4. Rename the plan and stamp the mid-cycle edit
  await prisma.plan.update({
    where: { id: plan.id },
    data: {
      name: NEW_PLAN_NAME,
      description:
        "4-day hypertrophy split (revised v1.2). Chest moved first on Day 1; core work is now loaded and trackable. Double progression: start at the bottom of each rep range, add reps weekly to the top, then add a little weight and repeat. Leave 1–2 reps in the tank. ~2,850–2,900 kcal, 145–180 g protein, 3 L water, 5 g creatine daily.",
      editedAt: new Date(),
    },
  });
  console.log(`Plan renamed to "${NEW_PLAN_NAME}".`);
}

main()
  .then(() => console.log("Done."))
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

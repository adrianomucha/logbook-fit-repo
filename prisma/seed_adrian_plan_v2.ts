/**
 * One-off seed: imports Adrian's "Hypertrophy 2.0" tracker (5-day split, 8
 * weeks) from the spreadsheet into the app as a Plan TEMPLATE owned by
 * coach@logbook.fit, then clones it into a client instance and makes that
 * Adrian's (adrianomucha@gmail.com) active plan.
 *
 * Mirrors POST /api/plans/[id]/assign: the coach keeps the template on the
 * Plans page, the client trains on their own copy (sourceTemplateId → template),
 * so future edits to the template never mutate a plan Adrian is mid-workout on.
 *
 * Successor to seed_adrian_plan.ts (Hypertrophy 1.1). What's new in 2.0:
 *  - New exercise variations on the same movement patterns (DB incline press,
 *    cable flys) for fresh stimulus without resetting the progression logic.
 *  - Trap-safe programming: all rows chest-supported, seated lateral raises
 *    with a shoulder-depression cue, zero direct shrug work.
 *  - Day 5 is a backup lower day — mandatory when Day 2 gets missed, glute/ham
 *    bonus volume when it doesn't.
 *
 * Run: npx tsx prisma/seed_adrian_plan_v2.ts
 * Safe to inspect before running; aborts if a plan with the same name already exists.
 */
import "dotenv/config";
import { PrismaClient, ExerciseCategory, TrackingType } from "@prisma/client";

const prisma = new PrismaClient();

const COACH_EMAIL = "coach@logbook.fit";
const CLIENT_EMAIL = "adrianomucha@gmail.com";
const PLAN_NAME = "Adrian — Hypertrophy 2.0";
const DURATION_WEEKS = 8;

type Ex = {
  name: string;
  category: ExerciseCategory;
  /** Omitted = REPS. TIME stores seconds in reps/repsMax. */
  tracking?: TrackingType;
  sets: number;
  /** Lower bound of the prescribed range (or seconds when tracking = TIME). */
  reps: number;
  /** Upper bound when the sheet prescribes a range, e.g. "6–10" → 6/10. */
  repsMax?: number;
  notes: string | null;
};

type DayDef = { name: string; description: string; exercises: Ex[] };

const DAYS: DayDef[] = [
  {
    name: "Day 1 — Chest + Lats",
    description: "Chest leads. Heaviest pressing of the week.",
    exercises: [
      {
        name: "Incline DB Press",
        category: "CHEST",
        sets: 4,
        reps: 6,
        repsMax: 10,
        notes:
          "30° bench max. Retract and DEPRESS shoulder blades into the bench before unracking — no shrugging the DBs up. Swapped from barbell for deeper stretch.",
      },
      {
        name: "Machine Chest Press or Weighted Dip",
        category: "CHEST",
        sets: 3,
        reps: 8,
        repsMax: 12,
        notes:
          "Pick one and stick with it for the block so progression is trackable. Slight forward lean on dips.",
      },
      {
        name: "Low-to-High Cable Fly",
        category: "CHEST",
        sets: 3,
        reps: 12,
        repsMax: 15,
        notes:
          "Replaces pec deck. Squeeze at the top, 2-sec stretch at the bottom. Upper-chest bias.",
      },
      {
        name: "Neutral-Grip Lat Pulldown",
        category: "BACK",
        sets: 3,
        reps: 8,
        repsMax: 12,
        notes:
          "Pull elbows to hips, chest tall. Let the lats stretch fully at the top without letting traps take over.",
      },
      {
        name: "Straight-Arm Pulldown",
        category: "BACK",
        sets: 3,
        reps: 12,
        repsMax: 15,
        notes: "Lat isolation finisher. Soft elbows, hinge slightly at hips.",
      },
    ],
  },
  {
    name: "Day 2 — Legs (Quad Focus) + Core",
    description: "If you miss this day, Day 5 becomes mandatory that week.",
    exercises: [
      {
        name: "Hack Squat or Leg Press",
        category: "LEGS",
        sets: 4,
        reps: 8,
        repsMax: 12,
        notes:
          "Primary quad driver. Full depth you can control. Progress load aggressively here — quads were undertrained in the original program.",
      },
      {
        name: "Bulgarian Split Squat",
        category: "LEGS",
        sets: 3,
        reps: 8,
        repsMax: 10,
        notes:
          "Per leg. Slight forward torso lean = more glute; upright = more quad. Hold DBs at sides.",
      },
      {
        name: "Leg Extension",
        category: "LEGS",
        sets: 3,
        reps: 12,
        repsMax: 15,
        notes: "Pause 1 sec at the top. Quad isolation — chase the burn, not the load.",
      },
      {
        name: "Standing Calf Raise",
        category: "LEGS",
        sets: 4,
        reps: 10,
        repsMax: 12,
        notes: "Full stretch at the bottom, 2-sec pause. Calves respond to range, not bounce.",
      },
      {
        name: "Cable Crunch",
        category: "CORE",
        sets: 3,
        reps: 10,
        repsMax: 15,
        notes:
          "Loaded core, double progression like everything else. Flex the spine, don't pull with arms.",
      },
    ],
  },
  {
    name: "Day 3 — Back + Biceps",
    description: "All rowing is chest-supported this block — zero trap momentum.",
    exercises: [
      {
        name: "Chest-Supported Row",
        category: "BACK",
        sets: 4,
        reps: 8,
        repsMax: 12,
        notes:
          "TRAP-SAFE SWAP: chest pad removes the shrug/momentum pattern that was aggravating your traps. Drive elbows down and back, squeeze mid-back.",
      },
      {
        name: "Wide-Grip Lat Pulldown",
        category: "BACK",
        sets: 3,
        reps: 10,
        repsMax: 12,
        notes: "Complements Day 1's neutral grip. Depress shoulders before each rep.",
      },
      {
        name: "Reverse Pec Deck",
        category: "SHOULDERS",
        sets: 3,
        reps: 12,
        repsMax: 15,
        notes: "Rear delts. Light weight, strict — no trap shrug at the end of the rep.",
      },
      {
        name: "EZ-Bar Curl",
        category: "BICEPS",
        sets: 3,
        reps: 8,
        repsMax: 12,
        notes: "Main bicep load. Elbows pinned, no swing.",
      },
      {
        name: "Incline DB Curl",
        category: "BICEPS",
        sets: 3,
        reps: 10,
        repsMax: 15,
        notes: "Stretch-position curl. Let arms hang fully behind torso.",
      },
    ],
  },
  {
    name: "Day 4 — Chest + Shoulders + Triceps",
    description:
      "Second chest hit of the week. Lateral raises stay light until traps are fully quiet.",
    exercises: [
      {
        name: "Flat Machine or Barbell Press",
        category: "CHEST",
        sets: 4,
        reps: 6,
        repsMax: 10,
        notes:
          "Chest first, always. Different angle from Day 1's incline so the two sessions don't overlap fully.",
      },
      {
        name: "Incline Cable Fly",
        category: "CHEST",
        sets: 3,
        reps: 12,
        repsMax: 15,
        notes:
          "Second upper-chest isolation of the week — this is deliberate given the chest-size goal.",
      },
      {
        name: "Seated DB Lateral Raise",
        category: "SHOULDERS",
        sets: 3,
        reps: 12,
        repsMax: 20,
        notes:
          "SEATED to kill momentum. Depress shoulders first, raise to just below parallel. If traps light up, drop the weight — this is the #1 trap trigger we identified.",
      },
      {
        name: "Overhead Cable Extension",
        category: "TRICEPS",
        sets: 3,
        reps: 10,
        repsMax: 12,
        notes: "Long-head stretch. Elbows tucked.",
      },
      {
        name: "Cable Pushdown",
        category: "TRICEPS",
        sets: 3,
        reps: 12,
        repsMax: 15,
        notes: "Lock elbows to sides. Full extension and squeeze.",
      },
    ],
  },
  {
    name: "Day 5 — Lower B + Core (Backup / Bonus)",
    description:
      "Missed Day 2? Do the full session incl. leg press. Hit Day 2? Skip leg press, treat the rest as glute/ham bonus volume.",
    exercises: [
      {
        name: "Hip Thrust",
        category: "GLUTES",
        sets: 4,
        reps: 8,
        repsMax: 12,
        notes: "Primary glute driver. Pause 1 sec at lockout, ribs down.",
      },
      {
        name: "Seated Leg Curl",
        category: "LEGS",
        sets: 3,
        reps: 10,
        repsMax: 15,
        notes: "Seated beats lying for hamstring stretch. Control the negative.",
      },
      {
        name: "Leg Press",
        category: "LEGS",
        sets: 3,
        reps: 8,
        repsMax: 12,
        notes:
          "ONLY if Day 2 was missed this week — skip it otherwise. Quad insurance that keeps weekly quad volume alive when Day 2 falls through.",
      },
      {
        name: "Standing Calf Raise",
        category: "LEGS",
        sets: 3,
        reps: 12,
        repsMax: 15,
        notes: "Same cues as Day 2.",
      },
      {
        name: "Weighted Plank / Copenhagen Plank",
        category: "CORE",
        tracking: "TIME",
        sets: 3,
        reps: 30,
        repsMax: 45,
        notes: "Alternate between the two week to week. Add plates to the plank over time.",
      },
    ],
  },
];

const PLAN_DESCRIPTION = [
  "Lean muscle-building block · 4 days + optional Day 5 · 8-week logging cycle.",
  "Double progression: log weight × reps weekly. When you hit the top of the rep range on ALL sets, add load next week and rebuild reps.",
  "Trap-safe block — all rows chest-supported, lateral raises seated with a shoulder-depression cue, zero direct shrug work.",
  "Day 5 is the backup lower day: mandatory the week you miss Day 2, glute/ham bonus volume when you don't.",
  "Nutrition: ~200 kcal surplus above maintenance, protein 145–180g, creatine 5g/day. Scale weight should trend UP over this block — flat weight = recomp, not growth.",
  "Cardio: 2–3×/week, 20–30 min Zone 2, low impact, kept away from leg days. Eat those calories back.",
].join(" ");

/**
 * Nested create payload for the whole plan — the same 8 weeks × 5 days for
 * both the coach's template (sourceTemplateId = null) and Adrian's copy.
 */
function buildPlanData(
  coachId: string,
  exerciseIdByName: Map<string, string>,
  sourceTemplateId: string | null
) {
  return {
    coachId,
    name: PLAN_NAME,
    description: PLAN_DESCRIPTION,
    emoji: "💪",
    durationWeeks: DURATION_WEEKS,
    workoutsPerWeek: DAYS.length,
    sourceTemplateId,
    weeks: {
      create: Array.from({ length: DURATION_WEEKS }, (_, w) => ({
        weekNumber: w + 1,
        days: {
          create: DAYS.map((day, d) => ({
            orderIndex: d + 1,
            name: day.name,
            description: day.description,
            exercises: {
              create: day.exercises.map((ex, i) => ({
                exerciseId: exerciseIdByName.get(ex.name)!,
                orderIndex: i + 1,
                trackingType: ex.tracking ?? "REPS",
                sets: ex.sets,
                reps: ex.reps,
                repsMax: ex.repsMax ?? null,
                coachNotes: ex.notes,
              })),
            },
          })),
        },
      })),
    },
  };
}

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

  // 2. Guard against duplicate runs (templates only — instances share the name)
  const existing = await prisma.plan.findFirst({
    where: { coachId, name: PLAN_NAME, sourceTemplateId: null, deletedAt: null },
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
          trackingType: ex.tracking ?? "REPS",
          defaultSets: ex.sets,
          // Library default is the top of the range — the plan carries the range itself.
          defaultReps: ex.repsMax ?? ex.reps,
          instructions: ex.notes ?? undefined,
        },
      });
      exerciseIdByName.set(ex.name, rec.id);
      created++;
    }
  }
  console.log(`Exercises: ${created} created, ${reused} reused (${uniqueExercises.size} unique).`);

  const rowsPerPlan =
    DURATION_WEEKS * DAYS.reduce((sum, day) => sum + day.exercises.length, 0);

  // 4. Coach's template — this is what shows up on the Plans page
  const template = await prisma.plan.create({
    data: buildPlanData(coachId, exerciseIdByName, null),
  });
  console.log(
    `Template created: ${template.id} — ${DURATION_WEEKS} weeks × ${DAYS.length} days, ${rowsPerPlan} workout-exercise rows.`
  );

  // 5. Clone-on-assign: Adrian trains on his own copy, not the template
  const instance = await prisma.plan.create({
    data: buildPlanData(coachId, exerciseIdByName, template.id),
  });
  console.log(`Client copy created: ${instance.id} (source template ${template.id}).`);

  // 6. Make it Adrian's active plan, starting today
  await prisma.clientProfile.update({
    where: { id: clientProfileId },
    data: { activePlanId: instance.id, planStartDate: new Date() },
  });
  console.log(`Assigned plan ${instance.id} to ${CLIENT_EMAIL} as active (start = today).`);
}

main()
  .then(() => console.log("Done."))
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

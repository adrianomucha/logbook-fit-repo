/**
 * Demo account for a live setup call with a coach.
 *
 * Builds one realistic coach — "Jamie Porter" — with a roster that puts a
 * client in every dashboard bucket, so the person running the call can show
 * the urgency-sorted dashboard, the check-in review, the plan builder and
 * the client's own app without staging anything by hand. The story and the
 * suggested run of show live in DEMO_CALL.md.
 *
 * Unlike prisma/seed.ts, these accounts are NOT covered by the demo lock, so
 * they work on production. The password comes from the environment and is
 * never written to the repo:
 *
 *   DEMO_CALL_PASSWORD='<a long random password>' npx tsx prisma/seed_demo_call.ts
 *
 * Optional: DEMO_CALL_COACH_EMAIL (default jamie@demo.logbook.fit) — the
 * client accounts share its domain.
 *
 * Re-running REBUILDS the scenario from scratch: every account it owns is
 * deleted (cascading their plans, workouts, check-ins and chat) and created
 * again with the timeline anchored to today. Run it the morning of a call so
 * "yesterday" and "2 hours ago" read as such. Nothing outside the scenario's
 * exact emails is touched.
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { startOfWeek } from "date-fns";
import {
  PrismaClient,
  type EffortRating,
  type ExerciseCategory,
  type TrackingType,
} from "@prisma/client";
import { QUICK_START_EXERCISES } from "../src/lib/quick-start-exercises";
import { isDemoAccount } from "../src/lib/demo";
import { isCommonPassword } from "../src/lib/validations/schemas";

const prisma = new PrismaClient();

const COACH_EMAIL = (process.env.DEMO_CALL_COACH_EMAIL ?? "jamie@demo.logbook.fit")
  .trim()
  .toLowerCase();
const PASSWORD = process.env.DEMO_CALL_PASSWORD;
const DOMAIN = COACH_EMAIL.split("@")[1];
const email = (handle: string) => `${handle}@${DOMAIN}`;

// ──────────────────────────────────────────────────────────────
// Time. Plan weeks start on Mondays (see workout-week-helpers), so every
// plan start is anchored to a Monday and the current week number is exact
// whatever weekday the seed runs on.
// ──────────────────────────────────────────────────────────────
const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date();
const THIS_MONDAY = startOfWeek(NOW, { weekStartsOn: 1 });

function at(base: Date, dayOffset: number, hour: number, minute = 0): Date {
  const d = new Date(base.getTime() + dayOffset * DAY_MS);
  d.setHours(hour, minute, 0, 0);
  return d;
}
/** Monday that starts `week` of a plan currently in `currentWeek`. */
function weekMonday(currentWeek: number, week: number): Date {
  return at(THIS_MONDAY, -(currentWeek - week) * 7, 0);
}
const daysAgo = (n: number, hour = 9, minute = 0) => at(NOW, -n, hour, minute);
const hoursAgo = (n: number) => new Date(NOW.getTime() - n * 60 * 60 * 1000);

// Training days within a week, as offsets from Monday
const OFFSETS: Record<number, number[]> = {
  3: [0, 2, 4], // Mon Wed Fri
  4: [0, 1, 3, 5], // Mon Tue Thu Sat
};

// ──────────────────────────────────────────────────────────────
// Exercise library: Quick Start (what every coach gets) plus a few of
// Jamie's own, some with coaching cues so the library looks lived-in.
// ──────────────────────────────────────────────────────────────
const EXTRA_EXERCISES: {
  name: string;
  category: ExerciseCategory;
  defaultSets: number;
  defaultReps: number;
  trackingType?: TrackingType;
  instructions?: string;
}[] = [
  { name: "Goblet Squat", category: "LEGS", defaultSets: 3, defaultReps: 10, instructions: "Elbows inside the knees at the bottom. Depth over load for the first two weeks." },
  { name: "Dumbbell Row", category: "BACK", defaultSets: 3, defaultReps: 10, instructions: "Pull to the hip, not the shoulder. Pause a beat at the top." },
  { name: "Walking Lunge", category: "LEGS", defaultSets: 2, defaultReps: 20, instructions: "20 steps total. Long stride, front shin vertical." },
  { name: "Kettlebell Swing", category: "FULL_BODY", defaultSets: 3, defaultReps: 15, instructions: "Hinge, don't squat. The bell floats to chest height — no higher." },
  { name: "Dead Bug", category: "CORE", defaultSets: 3, defaultReps: 10, instructions: "Lower back stays glued to the floor. Slow." },
];

const CUES: Record<string, string> = {
  "Barbell Back Squat": "Brace before you unrack. Hip crease below the knee.",
  "Conventional Deadlift": "Bar over mid-foot, reset every rep. No touch-and-go.",
  "Barbell Bench Press": "Feet planted, slight arch, bar to the lower chest.",
  "Bulgarian Split Squat": "Front foot far enough forward that the shin stays vertical.",
  "Romanian Deadlift": "Push the hips back until the hamstrings load, then stand up.",
};

// ──────────────────────────────────────────────────────────────
// Plan templates
// ──────────────────────────────────────────────────────────────
type ExDef = {
  name: string;
  sets: number;
  reps: number;
  repsMax?: number;
  weight?: number;
  trackingType?: TrackingType;
  rest?: number;
  notes?: string;
};
type DayDef = { name: string; description: string; exercises: ExDef[] };
type PlanDef = {
  name: string;
  description: string;
  emoji: string;
  durationWeeks: number;
  /** Added to every weighted exercise per week — linear progression */
  weeklyIncrement: number;
  days: DayDef[];
};

const STRENGTH: PlanDef = {
  name: "Strength Block — Upper/Lower",
  description:
    "Six weeks, four days. Big lifts first, +2.5 kg a week while every set hits the top of its range.",
  emoji: "🏋️",
  durationWeeks: 6,
  weeklyIncrement: 2.5,
  days: [
    {
      name: "Upper A",
      description: "Bench first while you're fresh. Leave two reps in the tank on every set.",
      exercises: [
        { name: "Barbell Bench Press", sets: 4, reps: 6, repsMax: 8, weight: 60, rest: 150 },
        { name: "Barbell Row", sets: 4, reps: 8, weight: 60, rest: 120 },
        { name: "Overhead Press", sets: 3, reps: 8, weight: 40, rest: 120 },
        { name: "Lat Pulldown", sets: 3, reps: 10, repsMax: 12, weight: 50, rest: 90 },
        { name: "Tricep Pushdown", sets: 3, reps: 12, rest: 60 },
        { name: "Face Pull", sets: 3, reps: 15, rest: 60, notes: "Light. Pull to the forehead." },
      ],
    },
    {
      name: "Lower A",
      description: "The hard one. Warm up properly and take the full rest between squat sets.",
      exercises: [
        { name: "Barbell Back Squat", sets: 4, reps: 6, weight: 80, rest: 180 },
        { name: "Romanian Deadlift", sets: 3, reps: 8, repsMax: 10, weight: 70, rest: 120 },
        { name: "Leg Press", sets: 3, reps: 12, weight: 120, rest: 90 },
        { name: "Calf Raise", sets: 4, reps: 15, rest: 60 },
        { name: "Plank", sets: 3, reps: 45, trackingType: "TIME", rest: 45 },
      ],
    },
    {
      name: "Upper B",
      description: "Volume day. Control the negatives, especially on the incline press.",
      exercises: [
        { name: "Incline Dumbbell Press", sets: 4, reps: 8, repsMax: 10, weight: 22, rest: 120 },
        { name: "Pull-Up", sets: 3, reps: 6, repsMax: 8, rest: 120, notes: "Band if you need it — full hang at the bottom." },
        { name: "Dumbbell Row", sets: 3, reps: 10, weight: 26, rest: 90 },
        { name: "Lateral Raise", sets: 3, reps: 15, weight: 8, rest: 60 },
        { name: "Barbell Curl", sets: 3, reps: 10, weight: 25, rest: 60 },
        { name: "Cable Crunch", sets: 3, reps: 15, rest: 60 },
      ],
    },
    {
      name: "Lower B",
      description: "Deadlift day. Three heavy sets, then accessories — nothing to failure.",
      exercises: [
        { name: "Conventional Deadlift", sets: 3, reps: 5, weight: 100, rest: 180 },
        { name: "Bulgarian Split Squat", sets: 3, reps: 10, weight: 14, rest: 90, notes: "Per leg. Dumbbells at your sides." },
        { name: "Leg Curl", sets: 3, reps: 12, rest: 60 },
        { name: "Hip Thrust", sets: 3, reps: 10, weight: 80, rest: 90 },
        { name: "Dead Bug", sets: 3, reps: 10, rest: 45 },
      ],
    },
  ],
};

const FOUNDATIONS: PlanDef = {
  name: "Foundations — 3 days",
  description:
    "The first month for someone new to the barbell. Three full-body days, a rest day between each, small jumps every week.",
  emoji: "🌱",
  durationWeeks: 4,
  weeklyIncrement: 2.5,
  days: [
    {
      name: "Full Body A",
      description: "Learn the patterns. Weights stay light until the movement is clean.",
      exercises: [
        { name: "Goblet Squat", sets: 3, reps: 10, weight: 16, rest: 90 },
        { name: "Dumbbell Bench Press", sets: 3, reps: 10, weight: 18, rest: 90 },
        { name: "Lat Pulldown", sets: 3, reps: 12, weight: 40, rest: 90 },
        { name: "Plank", sets: 3, reps: 30, trackingType: "TIME", rest: 45 },
      ],
    },
    {
      name: "Full Body B",
      description: "Hinge day. Film a set of RDLs if you can and send it over.",
      exercises: [
        { name: "Romanian Deadlift", sets: 3, reps: 10, weight: 50, rest: 120 },
        { name: "Overhead Press", sets: 3, reps: 8, weight: 30, rest: 120 },
        { name: "Cable Row", sets: 3, reps: 12, weight: 40, rest: 90 },
        { name: "Dead Bug", sets: 3, reps: 10, rest: 45 },
      ],
    },
    {
      name: "Full Body C",
      description: "Finish the week with some pace. Keep rests honest.",
      exercises: [
        { name: "Leg Press", sets: 3, reps: 12, weight: 90, rest: 90 },
        { name: "Incline Dumbbell Press", sets: 3, reps: 10, weight: 16, rest: 90 },
        { name: "Dumbbell Row", sets: 3, reps: 12, weight: 20, rest: 90 },
        { name: "Walking Lunge", sets: 2, reps: 20, rest: 90 },
        { name: "Kettlebell Swing", sets: 3, reps: 15, weight: 16, rest: 60 },
      ],
    },
  ],
};

const HYPERTROPHY: PlanDef = {
  name: "Hypertrophy Block — 4 days",
  description:
    "Eight weeks of volume. Push, pull, legs, upper. Chase reps first, then weight.",
  emoji: "🔥",
  durationWeeks: 8,
  weeklyIncrement: 2.5,
  days: [
    {
      name: "Push",
      description: "Presses first, then isolation. Last set of each to two reps in reserve.",
      exercises: [
        { name: "Barbell Bench Press", sets: 4, reps: 8, weight: 62.5, rest: 120 },
        { name: "Incline Dumbbell Press", sets: 3, reps: 10, repsMax: 12, weight: 22, rest: 90 },
        { name: "Overhead Press", sets: 3, reps: 10, weight: 37.5, rest: 120 },
        { name: "Lateral Raise", sets: 4, reps: 15, weight: 8, rest: 60 },
        { name: "Overhead Tricep Extension", sets: 3, reps: 12, rest: 60 },
      ],
    },
    {
      name: "Pull",
      description: "Deadlift stays heavy and low-rep; everything after it is volume.",
      exercises: [
        { name: "Conventional Deadlift", sets: 3, reps: 5, weight: 110, rest: 180 },
        { name: "Lat Pulldown", sets: 4, reps: 10, weight: 55, rest: 90 },
        { name: "Cable Row", sets: 3, reps: 12, weight: 50, rest: 90 },
        { name: "Face Pull", sets: 3, reps: 20, rest: 60 },
        { name: "Hammer Curl", sets: 3, reps: 12, weight: 12, rest: 60 },
      ],
    },
    {
      name: "Legs",
      description: "Squat, then machines. Eat before this one.",
      exercises: [
        { name: "Barbell Back Squat", sets: 4, reps: 8, weight: 90, rest: 180 },
        { name: "Leg Press", sets: 3, reps: 12, weight: 140, rest: 90 },
        { name: "Leg Curl", sets: 3, reps: 12, rest: 60 },
        { name: "Leg Extension", sets: 3, reps: 15, rest: 60 },
        { name: "Calf Raise", sets: 4, reps: 15, rest: 60 },
      ],
    },
    {
      name: "Upper",
      description: "Superset the press and the row to keep this under an hour.",
      exercises: [
        { name: "Dumbbell Bench Press", sets: 4, reps: 10, weight: 26, rest: 90 },
        { name: "Barbell Row", sets: 4, reps: 10, weight: 65, rest: 90 },
        { name: "Pull-Up", sets: 3, reps: 8, rest: 120 },
        { name: "Barbell Curl", sets: 3, reps: 12, weight: 25, rest: 60 },
        { name: "Cable Crunch", sets: 3, reps: 15, rest: 60 },
      ],
    },
  ],
};

// ──────────────────────────────────────────────────────────────
// Scenario
// ──────────────────────────────────────────────────────────────
type Handle = "priya" | "tom" | "marcus" | "sofia" | "daniel" | "hannah" | "leo" | "emily";

const PEOPLE: Record<Handle, { name: string }> = {
  priya: { name: "Priya Nair" },
  tom: { name: "Tom Becker" },
  marcus: { name: "Marcus Reid" },
  sofia: { name: "Sofia Alvarez" },
  daniel: { name: "Daniel Kim" },
  hannah: { name: "Hannah Brooks" },
  leo: { name: "Leo Fischer" },
  emily: { name: "Emily Sato" },
};
const INVITE_EMAIL = email("chris.doyle");

const SCENARIO_EMAILS = [COACH_EMAIL, ...Object.keys(PEOPLE).map(email)];

type PlanRecord = {
  id: string;
  weeks: { id: string; days: { id: string; exercises: { id: string; sets: number; reps: number; weight: number | null }[] }[] }[];
};

async function main() {
  if (!PASSWORD) {
    throw new Error("Set DEMO_CALL_PASSWORD in the environment (12+ characters).");
  }
  if (PASSWORD.length < 12 || isCommonPassword(PASSWORD)) {
    throw new Error("DEMO_CALL_PASSWORD must be at least 12 characters and not a common password.");
  }
  if (SCENARIO_EMAILS.some(isDemoAccount)) {
    throw new Error("The demo-call coach must not reuse a seeded demo email — those are locked on deployed builds.");
  }

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  // ── Rebuild: drop the scenario's own accounts, nothing else ───
  const existing = await prisma.user.findMany({
    where: { email: { in: SCENARIO_EMAILS, mode: "insensitive" } },
    select: { id: true, email: true },
  });
  if (existing.length) {
    await prisma.user.deleteMany({ where: { id: { in: existing.map((u) => u.id) } } });
    console.log(`↺ Removed ${existing.length} existing scenario account(s); rebuilding.`);
  }

  // ── Coach ─────────────────────────────────────────────────────
  const coachUser = await prisma.user.create({
    data: {
      email: COACH_EMAIL,
      passwordHash,
      name: "Jamie Porter",
      role: "COACH",
      createdAt: daysAgo(120),
      coachProfile: {
        create: {
          bio: "Online strength coach. Ten years on the gym floor, three online. Small roster on purpose — every client gets a plan I actually wrote and a check-in I actually read.",
        },
      },
    },
    include: { coachProfile: true },
  });
  const coach = coachUser.coachProfile!;
  console.log(`✓ Coach: ${coachUser.name} <${coachUser.email}>`);

  // ── Exercise library ──────────────────────────────────────────
  const exerciseId = new Map<string, string>();
  for (const ex of QUICK_START_EXERCISES) {
    const rec = await prisma.exercise.create({
      data: {
        coachId: coach.id,
        name: ex.name,
        category: ex.category,
        trackingType: ex.trackingType ?? "REPS",
        defaultSets: ex.defaultSets,
        defaultReps: ex.defaultReps,
        defaultRest: ex.defaultRest,
        instructions: CUES[ex.name],
        createdAt: daysAgo(120),
      },
    });
    exerciseId.set(ex.name, rec.id);
  }
  for (const ex of EXTRA_EXERCISES) {
    const rec = await prisma.exercise.create({
      data: { coachId: coach.id, ...ex, trackingType: ex.trackingType ?? "REPS", createdAt: daysAgo(100) },
    });
    exerciseId.set(ex.name, rec.id);
  }
  console.log(`✓ Library: ${exerciseId.size} exercises`);

  // ── Plans ─────────────────────────────────────────────────────
  async function createPlan(def: PlanDef, sourceTemplateId: string | null, createdAt: Date): Promise<PlanRecord> {
    for (const day of def.days) {
      for (const ex of day.exercises) {
        if (!exerciseId.has(ex.name)) throw new Error(`Unknown exercise in ${def.name}: ${ex.name}`);
      }
    }
    return prisma.plan.create({
      data: {
        coachId: coach.id,
        name: def.name,
        description: def.description,
        emoji: def.emoji,
        durationWeeks: def.durationWeeks,
        workoutsPerWeek: def.days.length,
        sourceTemplateId,
        createdAt,
        weeks: {
          create: Array.from({ length: def.durationWeeks }, (_, w) => ({
            weekNumber: w + 1,
            days: {
              create: def.days.map((day, d) => ({
                orderIndex: d + 1,
                name: day.name,
                description: day.description,
                exercises: {
                  create: day.exercises.map((ex, i) => ({
                    exerciseId: exerciseId.get(ex.name)!,
                    orderIndex: i + 1,
                    trackingType: ex.trackingType ?? "REPS",
                    sets: ex.sets,
                    reps: ex.reps,
                    repsMax: ex.repsMax,
                    weight: ex.weight != null ? ex.weight + w * def.weeklyIncrement : null,
                    restSeconds: ex.rest,
                    coachNotes: ex.notes,
                  })),
                },
              })),
            },
          })),
        },
      },
      include: {
        weeks: {
          orderBy: { weekNumber: "asc" },
          include: {
            days: {
              orderBy: { orderIndex: "asc" },
              include: { exercises: { orderBy: { orderIndex: "asc" }, select: { id: true, sets: true, reps: true, weight: true } } },
            },
          },
        },
      },
    });
  }

  const templates = {
    strength: await createPlan(STRENGTH, null, daysAgo(90)),
    foundations: await createPlan(FOUNDATIONS, null, daysAgo(110)),
    hypertrophy: await createPlan(HYPERTROPHY, null, daysAgo(75)),
  };
  console.log("✓ Plan templates: 3");

  // ── Clients ───────────────────────────────────────────────────
  type Client = { userId: string; profileId: string; name: string };

  async function createClient(handle: Handle, joinedAt: Date, status: "ACTIVE" | "INACTIVE" = "ACTIVE"): Promise<Client> {
    const user = await prisma.user.create({
      data: {
        email: email(handle),
        passwordHash,
        name: PEOPLE[handle].name,
        role: "CLIENT",
        createdAt: joinedAt,
        clientProfile: { create: { createdAt: joinedAt } },
      },
      include: { clientProfile: true },
    });
    await prisma.coachClientRelationship.create({
      data: { coachId: coach.id, clientId: user.clientProfile!.id, status, createdAt: joinedAt },
    });
    return { userId: user.id, profileId: user.clientProfile!.id, name: user.name };
  }

  /** Give the client their own copy of a template (clone-on-assign), started on the Monday of week 1. */
  async function assignPlan(client: Client, def: PlanDef, templateId: string, currentWeek: number) {
    const start = weekMonday(currentWeek, 1);
    const instance = await createPlan(def, templateId, at(start, 0, 9));
    await prisma.clientProfile.update({
      where: { id: client.profileId },
      data: { activePlanId: instance.id, planStartDate: start },
    });
    return instance;
  }

  const effortFor = (week: number, day: number, hard: boolean): EffortRating =>
    hard ? "HARD" : (week + day) % 3 === 0 ? "EASY" : "MEDIUM";

  /** Log a completed workout with every set done as prescribed. */
  async function complete(
    client: Client,
    plan: PlanRecord,
    week: number,
    dayIdx: number,
    completedAt: Date,
    opts: { effort: EffortRating; durationMin: number }
  ) {
    const day = plan.weeks[week - 1].days[dayIdx];
    const wc = await prisma.workoutCompletion.create({
      data: {
        clientId: client.profileId,
        planId: plan.id,
        dayId: day.id,
        status: "COMPLETED",
        startedAt: new Date(completedAt.getTime() - opts.durationMin * 60_000),
        completedAt,
        completionPct: 100,
        exercisesDone: day.exercises.length,
        exercisesTotal: day.exercises.length,
        durationSec: opts.durationMin * 60,
        effortRating: opts.effort,
        createdAt: completedAt,
      },
    });
    await prisma.setCompletion.createMany({
      data: day.exercises.flatMap((we) =>
        Array.from({ length: we.sets }, (_, s) => ({
          workoutCompletionId: wc.id,
          workoutExerciseId: we.id,
          setNumber: s + 1,
          completed: true,
          completedAt,
        }))
      ),
    });
    return wc;
  }

  /**
   * Train weeks `fromWeek..toWeek` in full, and the current week up to today,
   * on the plan's usual days (Mon/Tue/Thu/Sat or Mon/Wed/Fri) at 6 pm.
   */
  async function train(
    client: Client,
    plan: PlanRecord,
    def: PlanDef,
    currentWeek: number,
    opts: { fromWeek?: number; toWeek: number; includeCurrentWeek?: boolean; hardDays?: number[] }
  ) {
    const offsets = OFFSETS[def.days.length];
    const hard = new Set(opts.hardDays ?? []);
    let n = 0;
    const lastWeek = opts.includeCurrentWeek ? currentWeek : opts.toWeek;
    for (let week = opts.fromWeek ?? 1; week <= lastWeek; week++) {
      for (let d = 0; d < def.days.length; d++) {
        if (week > opts.toWeek && week !== currentWeek) continue;
        const when = at(weekMonday(currentWeek, week), offsets[d], 18, 10 + (n % 4) * 5);
        if (when > NOW) continue;
        await complete(client, plan, week, d, when, {
          effort: effortFor(week, d, hard.has(d)),
          durationMin: 42 + ((week * 7 + d * 3) % 12),
        });
        n++;
      }
    }
    return n;
  }

  async function checkIn(
    client: Client,
    data: {
      status: "PENDING" | "CLIENT_RESPONDED" | "COMPLETED";
      createdAt: Date;
      effort?: EffortRating;
      feeling?: string;
      pain?: string | null;
      respondedAt?: Date;
      feedback?: string;
      adjust?: boolean;
      repliedAt?: Date;
    }
  ) {
    return prisma.checkIn.create({
      data: {
        coachId: coach.id,
        clientId: client.profileId,
        status: data.status,
        createdAt: data.createdAt,
        effortRating: data.effort,
        clientFeeling: data.feeling,
        painBlockers: data.pain ?? null,
        clientRespondedAt: data.respondedAt,
        coachFeedback: data.feedback,
        planAdjustment: data.adjust ?? false,
        coachRespondedAt: data.repliedAt,
        completedAt: data.status === "COMPLETED" ? data.repliedAt : null,
      },
    });
  }

  async function thread(
    client: Client,
    messages: { from: "coach" | "client"; text: string; at: Date; unread?: boolean }[]
  ) {
    for (const m of messages) {
      await prisma.message.create({
        data: {
          senderId: m.from === "coach" ? coachUser.id : client.userId,
          recipientId: m.from === "coach" ? client.userId : coachUser.id,
          content: m.text,
          createdAt: m.at,
          readAt: m.unread ? null : new Date(m.at.getTime() + 20 * 60_000),
        },
      });
    }
  }

  // 1. Priya — signed up from an invite yesterday, no plan, hasn't heard from Jamie yet.
  //    Dashboard: NEEDS_PLAN with the "Say hello" nudge.
  const priya = await createClient("priya", hoursAgo(20));
  await prisma.clientInvite.create({
    data: {
      coachId: coach.id,
      token: `demo-${coach.id.slice(0, 8)}-priya`,
      email: email("priya"),
      status: "ACCEPTED",
      createdAt: daysAgo(3, 11),
      expiresAt: daysAgo(-4, 11),
    },
  });
  console.log(`✓ ${priya.name}: joined yesterday, waiting on a first plan`);

  // 2. Tom — finished the 8-week hypertrophy block on Saturday. Dashboard: PLAN_ENDED.
  const tom = await createClient("tom", daysAgo(66, 14));
  const tomPlan = await assignPlan(tom, HYPERTROPHY, templates.hypertrophy.id, 9);
  const tomWorkouts = await train(tom, tomPlan, HYPERTROPHY, 9, { fromWeek: 5, toWeek: 8, hardDays: [2] });
  await checkIn(tom, {
    status: "COMPLETED",
    createdAt: daysAgo(11, 9),
    effort: "HARD",
    feeling: "Week 6 was the hardest of the block so far — legs day especially. Still hit every rep.",
    respondedAt: daysAgo(10, 20),
    feedback: "That's exactly where week 6 should sit. Two more, then we change things up.",
    repliedAt: daysAgo(10, 21),
  });
  await checkIn(tom, {
    status: "COMPLETED",
    createdAt: daysAgo(4, 9),
    effort: "MEDIUM",
    feeling: "Final week done. Bench ended at 80 for 8 — started the block at 62.5. What's next?",
    respondedAt: daysAgo(4, 19),
    feedback: "Brilliant block, Tom. Next one lands this weekend: a bit more upper volume, squat keeps climbing.",
    adjust: true,
    repliedAt: daysAgo(4, 21),
  });
  await thread(tom, [
    { from: "client", text: "Week 6 done. Legs day is brutal in the best way.", at: daysAgo(10, 20) },
    { from: "coach", text: "That's the point of week 6 😄 Two more, then we deload and switch things up.", at: daysAgo(10, 21) },
    { from: "client", text: "Final week done! What's next?", at: daysAgo(4, 19) },
    { from: "coach", text: "Great block. I'll build the next one this weekend — more upper volume, keep the squat progression going.", at: daysAgo(4, 21) },
    { from: "client", text: "Any news on the new block? Gym's booked for Monday 💪", at: daysAgo(1, 8, 40), unread: true },
  ]);
  console.log(`✓ ${tom.name}: plan ended, ${tomWorkouts} workouts logged, asking for the next block`);

  // 3. Marcus — week 4 of the strength block, nothing logged since week 2, ignoring a check-in.
  //    Dashboard: AT_RISK — the client the product exists to catch.
  const marcus = await createClient("marcus", daysAgo(24, 10));
  const marcusPlan = await assignPlan(marcus, STRENGTH, templates.strength.id, 4);
  const marcusWorkouts = await train(marcus, marcusPlan, STRENGTH, 4, { toWeek: 2, hardDays: [1, 3] });
  await checkIn(marcus, {
    status: "COMPLETED",
    createdAt: daysAgo(14, 9),
    effort: "HARD",
    feeling: "Tough week, honestly. Every session felt heavy and I'm not sleeping great.",
    pain: "Nothing hurting, just flat.",
    respondedAt: daysAgo(13, 22),
    feedback: "Heavy is fine, flat isn't. Drop the accessories this week and just do the main lifts — 30 minutes in and out.",
    adjust: true,
    repliedAt: daysAgo(13, 22, 30),
  });
  await checkIn(marcus, { status: "PENDING", createdAt: daysAgo(6, 9) });
  await thread(marcus, [
    { from: "coach", text: "Hey Marcus — nothing logged since last week. All good?", at: daysAgo(5, 12) },
    { from: "client", text: "Sorry, work trip and then a cold. Back on it Monday, promise.", at: daysAgo(4, 8) },
    { from: "coach", text: "No stress. When you're back, just do Lower A and skip the rest of the week — we pick up from there.", at: daysAgo(4, 8, 30), unread: true },
  ]);
  console.log(`✓ ${marcus.name}: at risk, ${marcusWorkouts} workouts then silence`);

  // 4. Sofia — week 3, training consistently, answered her check-in 2 hours ago with a knee
  //    complaint that matches an exercise she flagged. Dashboard: AWAITING_RESPONSE (Review Check-in).
  const sofia = await createClient("sofia", daysAgo(17, 16));
  const sofiaPlan = await assignPlan(sofia, STRENGTH, templates.strength.id, 3);
  const sofiaWorkouts = await train(sofia, sofiaPlan, STRENGTH, 3, { toWeek: 2, includeCurrentWeek: true, hardDays: [3] });
  {
    // Week 2 Lower B: split squats cut short — the flag and the set data tell the same story
    const lowerB = sofiaPlan.weeks[1].days[3];
    const splitSquat = lowerB.exercises[1];
    const wc = await prisma.workoutCompletion.findUniqueOrThrow({
      where: { clientId_planId_dayId: { clientId: sofia.profileId, planId: sofiaPlan.id, dayId: lowerB.id } },
    });
    await prisma.exerciseFlag.create({
      data: {
        workoutCompletionId: wc.id,
        workoutExerciseId: splitSquat.id,
        note: "Right knee felt off at the bottom on the last set — stopped at 6 reps.",
        createdAt: wc.completedAt!,
      },
    });
    await prisma.setCompletion.update({
      where: {
        workoutCompletionId_workoutExerciseId_setNumber: {
          workoutCompletionId: wc.id,
          workoutExerciseId: splitSquat.id,
          setNumber: splitSquat.sets,
        },
      },
      data: { actualReps: 6, actualWeight: splitSquat.weight },
    });
  }
  await checkIn(sofia, {
    status: "COMPLETED",
    createdAt: daysAgo(9, 9),
    effort: "MEDIUM",
    feeling: "Good first week. Bench felt easy, squats felt heavy — probably the right way round.",
    respondedAt: daysAgo(8, 19),
    feedback: "That's the right way round. Add 2.5 on bench next session, keep squat where it is one more week.",
    repliedAt: daysAgo(8, 20),
  });
  await checkIn(sofia, {
    status: "CLIENT_RESPONDED",
    createdAt: daysAgo(2, 9),
    effort: "HARD",
    feeling: "Solid week — bench moved up and I hit every session. Split squats are the one thing I'm wary of.",
    pain: "Right knee twinges at the bottom of split squats, second week in a row. No pain walking or squatting.",
    respondedAt: hoursAgo(2),
  });
  await thread(sofia, [
    { from: "client", text: "Bench felt easy this week — should I add weight?", at: daysAgo(6, 20) },
    { from: "coach", text: "Yes, +2.5 next session. If the last set still hits 8, add again.", at: daysAgo(6, 20, 30) },
    { from: "client", text: "Sent my check-in. The knee thing isn't bad, I just want your call on whether to keep split squats in.", at: hoursAgo(2), unread: true },
  ]);
  console.log(`✓ ${sofia.name}: check-in waiting for review, ${sofiaWorkouts} workouts, 1 flagged exercise`);

  // 5. Daniel — week 2 of Foundations, check-in sent this morning and not yet answered.
  //    Dashboard: CHECKIN_DUE. Linked to the coach account for the one-click switch — this
  //    is the client whose app you show on the call.
  const daniel = await createClient("daniel", daysAgo(10, 11));
  const danielPlan = await assignPlan(daniel, FOUNDATIONS, templates.foundations.id, 2);
  const danielWorkouts = await train(daniel, danielPlan, FOUNDATIONS, 2, { toWeek: 1, includeCurrentWeek: true });
  await checkIn(daniel, {
    status: "COMPLETED",
    createdAt: daysAgo(7, 9),
    effort: "MEDIUM",
    feeling: "First week done! Sore in places I didn't know existed but nothing hurts.",
    respondedAt: daysAgo(6, 18),
    feedback: "That's week one for everyone. Keep the weights where they are, focus on depth on the goblet squats.",
    repliedAt: daysAgo(6, 19),
  });
  await checkIn(daniel, { status: "PENDING", createdAt: hoursAgo(5) });
  await thread(daniel, [
    { from: "coach", text: "Welcome, Daniel! Your first block is up — three days a week, nothing fancy. Start whenever you're ready.", at: daysAgo(10, 11, 30) },
    { from: "client", text: "Thanks! Starting tomorrow.", at: daysAgo(10, 13) },
    { from: "client", text: "Goblet squats are humbling 😅", at: daysAgo(3, 19) },
    { from: "coach", text: "They are. Depth over weight for the first two weeks — the weight comes.", at: daysAgo(3, 19, 30) },
  ]);
  await prisma.user.update({ where: { id: coachUser.id }, data: { linkedUserId: daniel.userId } });
  await prisma.user.update({ where: { id: daniel.userId }, data: { linkedUserId: coachUser.id } });
  console.log(`✓ ${daniel.name}: check-in due, ${danielWorkouts} workouts, linked to the coach for account switching`);

  // 6. Hannah — week 5 of 6, four weeks of clean history and a bench PR. Dashboard: ON_TRACK.
  const hannah = await createClient("hannah", daysAgo(31, 9));
  const hannahPlan = await assignPlan(hannah, STRENGTH, templates.strength.id, 5);
  const hannahWorkouts = await train(hannah, hannahPlan, STRENGTH, 5, { toWeek: 4, includeCurrentWeek: true, hardDays: [3] });
  const hannahCheckIns: Parameters<typeof checkIn>[1][] = [
    { status: "COMPLETED", createdAt: daysAgo(24, 9), effort: "MEDIUM", feeling: "Good start. Deadlift form felt shaky on the last set.", respondedAt: daysAgo(23, 20), feedback: "Film the next one and send it over — probably just the bar drifting forward.", repliedAt: daysAgo(23, 21) },
    { status: "COMPLETED", createdAt: daysAgo(17, 9), effort: "MEDIUM", feeling: "Deadlift felt much better with the cue. Everything else on track.", respondedAt: daysAgo(16, 19), feedback: "Saw the video — night and day. Keep going.", repliedAt: daysAgo(16, 20) },
    { status: "COMPLETED", createdAt: daysAgo(10, 9), effort: "HARD", feeling: "Bench PR: 45 for 8! Lower B was rough though, legs still tired from Thursday.", respondedAt: daysAgo(9, 20), feedback: "Huge PR. Move Lower B to Saturday if Thursday runs late — an extra day between the two makes a difference.", adjust: false, repliedAt: daysAgo(9, 21) },
    { status: "COMPLETED", createdAt: daysAgo(3, 9), effort: "MEDIUM", feeling: "Best week yet. Can we add a bit of arm work?", respondedAt: daysAgo(2, 18), feedback: "Yes — a curl/pushdown pairing goes into Upper B from next week.", adjust: true, repliedAt: daysAgo(2, 19) },
  ];
  for (const c of hannahCheckIns) await checkIn(hannah, c);
  await thread(hannah, [
    { from: "client", text: "Hit 45 on bench for 8 — that's a PR!", at: daysAgo(12, 19) },
    { from: "coach", text: "Huge. Told you the pause reps would pay off.", at: daysAgo(12, 19, 30) },
    { from: "client", text: "Any chance of adding a bit of arm work on upper days?", at: daysAgo(2, 18, 15) },
    { from: "coach", text: "Sure — I'll add a curl/pushdown pairing to Upper B from next week.", at: daysAgo(2, 19) },
  ]);
  console.log(`✓ ${hannah.name}: on track, ${hannahWorkouts} workouts, 4 check-ins`);

  // 7. Leo — week 3 of Foundations, quietly consistent. Dashboard: ON_TRACK.
  const leo = await createClient("leo", daysAgo(17, 15));
  const leoPlan = await assignPlan(leo, FOUNDATIONS, templates.foundations.id, 3);
  const leoWorkouts = await train(leo, leoPlan, FOUNDATIONS, 3, { toWeek: 2, includeCurrentWeek: true });
  await checkIn(leo, {
    status: "COMPLETED",
    createdAt: daysAgo(11, 9),
    effort: "EASY",
    feeling: "All fine. Could probably go heavier on the leg press.",
    respondedAt: daysAgo(10, 21),
    feedback: "Go up 10 on the leg press, everything else stays.",
    adjust: true,
    repliedAt: daysAgo(10, 22),
  });
  await checkIn(leo, {
    status: "COMPLETED",
    createdAt: daysAgo(4, 9),
    effort: "MEDIUM",
    feeling: "Leg press at 100 felt right. Good week.",
    respondedAt: daysAgo(3, 20),
    feedback: "Perfect. Two more weeks and we look at a 4-day split.",
    repliedAt: daysAgo(3, 21),
  });
  await thread(leo, [
    { from: "coach", text: "Welcome, Leo! Foundations is up — three days, a rest day between each.", at: daysAgo(17, 15, 30) },
    { from: "client", text: "Cheers. Monday it is.", at: daysAgo(17, 17) },
  ]);
  console.log(`✓ ${leo.name}: on track, ${leoWorkouts} workouts`);

  // 8. Emily — ended the relationship three weeks ago. Appears under Past clients only.
  const emily = await createClient("emily", daysAgo(70, 12), "INACTIVE");
  const emilyPlan = await createPlan(FOUNDATIONS, templates.foundations.id, daysAgo(70, 12));
  await prisma.coachClientRelationship.update({
    where: { clientId: emily.profileId },
    data: {
      endedAt: daysAgo(21, 9),
      endedBy: "CLIENT",
      endedPlanId: emilyPlan.id,
      endedPlanStartDate: at(weekMonday(10, 1), 0, 0),
    },
  });
  console.log(`✓ ${emily.name}: past client`);

  // A pending invite, sent two days ago, so the dashboard's invite list isn't empty
  await prisma.clientInvite.create({
    data: {
      coachId: coach.id,
      token: `demo-${coach.id.slice(0, 8)}-chris`,
      email: INVITE_EMAIL,
      note: "Hey Chris — here's your link. First week is easy on purpose.",
      status: "PENDING",
      createdAt: daysAgo(2, 10),
      expiresAt: daysAgo(-5, 10),
    },
  });
  console.log(`✓ Pending invite for ${INVITE_EMAIL}`);

  console.log("\nDemo-call account ready.");
  console.log("─────────────────────────────────────────────");
  console.log(`  Coach:   ${COACH_EMAIL}  (Jamie Porter)`);
  console.log(`  Client:  ${email("daniel")}  (Daniel Kim — also reachable via "Switch to client")`);
  console.log("  Password: the DEMO_CALL_PASSWORD you set. It is not stored anywhere in the repo.");
  console.log("─────────────────────────────────────────────");
  console.log("Run of show: DEMO_CALL.md");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

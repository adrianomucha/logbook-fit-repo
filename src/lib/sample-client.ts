import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

/**
 * Sample-client mode: creates a realistic demo client for a coach so they can
 * feel the urgency-sorted dashboard and the check-in loop before a real
 * client joins. Everything is real data flowing through the real UI — the
 * client is just flagged (ClientProfile.isSample) and removable in one action.
 *
 * The generated story: Riley is 9 days into a 2-week plan, trained 4 times,
 * flagged deadlifts for back tightness, and responded to a check-in a few
 * hours ago — so the coach lands on AWAITING_RESPONSE and gets to review and
 * reply, which is the product's north-star moment.
 */

export const SAMPLE_CLIENT_NAME = "Riley Chen";
export const SAMPLE_PLAN_NAME = "Sample: Foundation Strength";

const sampleEmail = (coachProfileId: string) =>
  `sample-${coachProfileId}@sample.logbook.fit`;

function daysAgo(n: number, hour = 8): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 0, 0, 0);
  return d;
}

function hoursAgo(n: number): Date {
  return new Date(Date.now() - n * 60 * 60 * 1000);
}

type SampleExercise = {
  name: string;
  sets: number;
  reps: number;
  repsMax?: number;
  weight?: number;
  trackingType?: "REPS" | "TIME";
};

type SampleDay = { name: string; exercises: SampleExercise[] };

// Built exclusively from Quick Start names, which every coach's library
// starts with; any the coach has since deleted are recreated.
const SAMPLE_DAYS: SampleDay[] = [
  {
    name: "Full Body A",
    exercises: [
      { name: "Barbell Back Squat", sets: 4, reps: 6, weight: 135 },
      { name: "Barbell Bench Press", sets: 4, reps: 8, weight: 115 },
      { name: "Barbell Row", sets: 4, reps: 8, weight: 95 },
      { name: "Plank", sets: 3, reps: 60, trackingType: "TIME" },
    ],
  },
  {
    name: "Full Body B",
    exercises: [
      { name: "Romanian Deadlift", sets: 3, reps: 10, weight: 115 },
      { name: "Overhead Press", sets: 3, reps: 8, weight: 65 },
      { name: "Lat Pulldown", sets: 3, reps: 10, weight: 100 },
      { name: "Lateral Raise", sets: 3, reps: 15, weight: 15 },
    ],
  },
  {
    name: "Full Body C",
    exercises: [
      { name: "Conventional Deadlift", sets: 3, reps: 5, weight: 185 },
      { name: "Incline Dumbbell Press", sets: 3, reps: 10, weight: 40 },
      { name: "Cable Row", sets: 3, reps: 12, weight: 120 },
      { name: "Face Pull", sets: 3, reps: 15, weight: 30 },
    ],
  },
];

/** The coach's existing sample client, if one exists. */
export async function findSampleClient(coachProfileId: string) {
  const rel = await prisma.coachClientRelationship.findFirst({
    where: { coachId: coachProfileId, client: { isSample: true } },
    include: { client: { select: { id: true, userId: true, activePlanId: true } } },
  });
  return rel?.client ?? null;
}

export async function createSampleClient(
  coachProfileId: string,
  coachUserId: string
): Promise<{ clientProfileId: string; created: boolean }> {
  const existing = await findSampleClient(coachProfileId);
  if (existing) return { clientProfileId: existing.id, created: false };

  // Random password — the sample account is never meant to be logged into
  const passwordHash = await bcrypt.hash(randomBytes(32).toString("hex"), 10);

  // ── Client account ──────────────────────────────────────────────
  const user = await prisma.user.create({
    data: {
      email: sampleEmail(coachProfileId),
      passwordHash,
      name: SAMPLE_CLIENT_NAME,
      role: "CLIENT",
      clientProfile: { create: { isSample: true } },
    },
    include: { clientProfile: true },
  });
  const clientId = user.clientProfile!.id;

  await prisma.coachClientRelationship.create({
    data: { coachId: coachProfileId, clientId, status: "ACTIVE" },
  });

  // ── Exercises (reuse the coach's library; recreate any deleted) ─
  const exerciseIds = new Map<string, string>();
  for (const day of SAMPLE_DAYS) {
    for (const ex of day.exercises) {
      if (exerciseIds.has(ex.name)) continue;
      const found = await prisma.exercise.findFirst({
        where: { coachId: coachProfileId, name: ex.name, deletedAt: null },
      });
      if (found) {
        exerciseIds.set(ex.name, found.id);
      } else {
        const created = await prisma.exercise.create({
          data: {
            coachId: coachProfileId,
            name: ex.name,
            trackingType: ex.trackingType ?? "REPS",
            defaultSets: ex.sets,
            defaultReps: ex.reps,
          },
        });
        exerciseIds.set(ex.name, created.id);
      }
    }
  }

  // ── Plan: 2 weeks × 3 full-body days ────────────────────────────
  const plan = await prisma.plan.create({
    data: {
      coachId: coachProfileId,
      name: SAMPLE_PLAN_NAME,
      description:
        "Demo plan powering your sample client. Removing the sample client removes this plan too (unless you've assigned it to someone real).",
      emoji: "🧪",
      durationWeeks: 2,
      workoutsPerWeek: 3,
    },
  });

  // dayRecords[week-1][day-index] = { dayId, workoutExerciseIds aligned to SAMPLE_DAYS order }
  const dayRecords: { dayId: string; weIds: string[] }[][] = [];
  for (let weekNum = 1; weekNum <= 2; weekNum++) {
    const week = await prisma.week.create({
      data: { planId: plan.id, weekNumber: weekNum },
    });
    const weekDays: { dayId: string; weIds: string[] }[] = [];
    for (let d = 0; d < SAMPLE_DAYS.length; d++) {
      const tmpl = SAMPLE_DAYS[d];
      const day = await prisma.day.create({
        data: { weekId: week.id, orderIndex: d + 1, name: tmpl.name },
      });
      const weIds: string[] = [];
      for (let i = 0; i < tmpl.exercises.length; i++) {
        const ex = tmpl.exercises[i];
        const we = await prisma.workoutExercise.create({
          data: {
            dayId: day.id,
            exerciseId: exerciseIds.get(ex.name)!,
            orderIndex: i,
            trackingType: ex.trackingType ?? "REPS",
            sets: ex.sets,
            reps: ex.reps,
            // Week 2 progresses weights slightly
            weight: ex.weight ? ex.weight + (weekNum - 1) * 5 : undefined,
          },
        });
        weIds.push(we.id);
      }
      weekDays.push({ dayId: day.id, weIds });
    }
    dayRecords.push(weekDays);
  }

  await prisma.clientProfile.update({
    where: { id: clientId },
    data: { activePlanId: plan.id, planStartDate: daysAgo(9) },
  });

  // ── Workout history: week 1 complete, week 2 under way ──────────
  async function complete(
    day: { dayId: string; weIds: string[] },
    dayTemplateIndex: number,
    opts: { completedDaysAgo: number; durationMin: number; effort: "EASY" | "MEDIUM" | "HARD" }
  ) {
    const completedAt = daysAgo(opts.completedDaysAgo, 18);
    const wc = await prisma.workoutCompletion.create({
      data: {
        clientId,
        planId: plan.id,
        dayId: day.dayId,
        status: "COMPLETED",
        startedAt: new Date(completedAt.getTime() - opts.durationMin * 60_000),
        completedAt,
        completionPct: 100,
        exercisesDone: day.weIds.length,
        exercisesTotal: day.weIds.length,
        durationSec: opts.durationMin * 60,
        effortRating: opts.effort,
      },
    });
    await prisma.setCompletion.createMany({
      data: day.weIds.flatMap((weId, i) =>
        Array.from(
          { length: SAMPLE_DAYS[dayTemplateIndex].exercises[i].sets },
          (_, s) => ({
            workoutCompletionId: wc.id,
            workoutExerciseId: weId,
            setNumber: s + 1,
            completed: true,
            completedAt,
          })
        )
      ),
    });
    return wc;
  }

  const [week1, week2] = dayRecords;
  await complete(week1[0], 0, { completedDaysAgo: 8, durationMin: 44, effort: "MEDIUM" });
  await complete(week1[1], 1, { completedDaysAgo: 6, durationMin: 41, effort: "MEDIUM" });
  const w1d3 = await complete(week1[2], 2, { completedDaysAgo: 4, durationMin: 49, effort: "HARD" });
  await complete(week2[0], 0, { completedDaysAgo: 1, durationMin: 43, effort: "MEDIUM" });

  // Riley flagged deadlifts on week 1 day 3 — surfaces in check-in review
  await prisma.exerciseFlag.create({
    data: {
      workoutCompletionId: w1d3.id,
      workoutExerciseId: week1[2].weIds[0], // Conventional Deadlift
      note: "Lower back felt tight on the last set, dropped the weight for the final reps.",
      createdAt: daysAgo(4, 18),
    },
  });

  // The flag's story in the set data: the final deadlift set was taken
  // lighter — shows up as a deviation in the coach's workout history
  const deadlift = SAMPLE_DAYS[2].exercises[0];
  await prisma.setCompletion.updateMany({
    where: {
      workoutCompletionId: w1d3.id,
      workoutExerciseId: week1[2].weIds[0],
      setNumber: deadlift.sets,
    },
    data: { actualWeight: (deadlift.weight ?? 185) - 30 },
  });

  // ── Check-in awaiting the coach's reply (the north-star moment) ─
  await prisma.checkIn.create({
    data: {
      coachId: coachProfileId,
      clientId,
      status: "CLIENT_RESPONDED",
      effortRating: "HARD",
      clientFeeling:
        "Strong week. Hit all my sessions and squats are moving well. Deadlifts felt heavy on the last set though.",
      painBlockers: "Some lower-back tightness after deadlifts",
      clientRespondedAt: hoursAgo(3),
      createdAt: daysAgo(2),
    },
  });

  // ── A short chat thread with one unread message ──────────────────
  const thread: { from: "client" | "coach"; content: string; at: Date; unread?: boolean }[] = [
    {
      from: "client",
      content: "First week done! The full-body split fits my schedule way better than my old routine.",
      at: daysAgo(4, 19),
    },
    {
      from: "coach",
      content: "Love to hear it. Keep the deadlifts honest: bar close, brace hard.",
      at: daysAgo(4, 20),
    },
    {
      from: "client",
      content: "Should I keep the deadlift weight where it is this week, or push it?",
      at: hoursAgo(3),
      unread: true,
    },
  ];
  for (const msg of thread) {
    await prisma.message.create({
      data: {
        senderId: msg.from === "client" ? user.id : coachUserId,
        recipientId: msg.from === "client" ? coachUserId : user.id,
        content: msg.content,
        readAt: msg.unread ? null : msg.at,
        createdAt: msg.at,
      },
    });
  }

  return { clientProfileId: clientId, created: true };
}

/**
 * Removes the coach's sample client. Deleting the user cascades the profile,
 * relationship, completions, check-ins, flags, and messages. The sample plan
 * is soft-deleted only if it's still recognizably the sample plan and isn't
 * assigned to anyone real.
 */
export async function deleteSampleClient(coachProfileId: string): Promise<boolean> {
  const sample = await findSampleClient(coachProfileId);
  if (!sample) return false;

  const planId = sample.activePlanId;
  await prisma.user.delete({ where: { id: sample.userId } });

  if (planId) {
    const plan = await prisma.plan.findFirst({
      where: {
        id: planId,
        coachId: coachProfileId,
        name: SAMPLE_PLAN_NAME,
        deletedAt: null,
      },
      include: { assignedTo: { select: { id: true } } },
    });
    if (plan && plan.assignedTo.length === 0) {
      await prisma.plan.update({
        where: { id: plan.id },
        data: { deletedAt: new Date() },
      });
    }
  }

  return true;
}

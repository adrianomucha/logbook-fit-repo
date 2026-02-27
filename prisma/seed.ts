import { PrismaClient } from "../generated/prisma/client";
import bcrypt from "bcryptjs";
import { QUICK_START_EXERCISES } from "../src/lib/quick-start-exercises";

const prisma = new PrismaClient();

// Helper: date N days ago
function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(8, 0, 0, 0);
  return d;
}

function hoursAgo(n: number): Date {
  return new Date(Date.now() - n * 60 * 60 * 1000);
}

async function seed() {
  console.log("Seeding database...\n");

  const passwordHash = await bcrypt.hash("demo1234", 10);

  // ─────────────────────────────────────────────
  // 1. COACH
  // ─────────────────────────────────────────────
  const coachUser = await prisma.user.create({
    data: {
      email: "coach@logbook.fit",
      passwordHash,
      name: "Sarah Johnson",
      role: "COACH",
      coachProfile: {
        create: { bio: "Strength & conditioning coach specializing in progressive overload programs" },
      },
    },
    include: { coachProfile: true },
  });
  const coachProfileId = coachUser.coachProfile!.id;
  console.log(`✓ Coach: ${coachUser.name} (${coachUser.email})`);

  // ─────────────────────────────────────────────
  // 2. EXERCISE LIBRARY
  // ─────────────────────────────────────────────
  const exercises: Record<string, string> = {};
  for (const ex of QUICK_START_EXERCISES) {
    const created = await prisma.exercise.create({
      data: {
        coachId: coachProfileId,
        name: ex.name,
        category: ex.category,
        defaultSets: ex.defaultSets,
        defaultReps: ex.defaultReps,
        defaultRest: ex.defaultRest,
      },
    });
    exercises[ex.name] = created.id;
  }
  // Add HIIT/conditioning exercises not in the quick-start library
  const hiitExercises = [
    { name: "Burpee", category: "FULL_BODY" as const, defaultSets: 4, defaultReps: 12 },
    { name: "Jump Squat", category: "LEGS" as const, defaultSets: 4, defaultReps: 20 },
    { name: "Mountain Climber", category: "CORE" as const, defaultSets: 4, defaultReps: 20 },
    { name: "Push-Up", category: "CHEST" as const, defaultSets: 4, defaultReps: 15 },
    { name: "Kettlebell Swing", category: "FULL_BODY" as const, defaultSets: 4, defaultReps: 15 },
    { name: "Box Jump", category: "LEGS" as const, defaultSets: 4, defaultReps: 12 },
    { name: "Battle Rope", category: "FULL_BODY" as const, defaultSets: 4, defaultReps: 20 },
    { name: "Rowing Machine", category: "CARDIO" as const, defaultSets: 5, defaultReps: 1 },
    { name: "Assault Bike", category: "CARDIO" as const, defaultSets: 5, defaultReps: 1 },
    { name: "Thrusters", category: "FULL_BODY" as const, defaultSets: 4, defaultReps: 12 },
  ];

  for (const ex of hiitExercises) {
    const created = await prisma.exercise.create({
      data: {
        coachId: coachProfileId,
        name: ex.name,
        category: ex.category,
        defaultSets: ex.defaultSets,
        defaultReps: ex.defaultReps,
      },
    });
    exercises[ex.name] = created.id;
  }

  console.log(`✓ ${QUICK_START_EXERCISES.length + hiitExercises.length} exercises created`);

  // ─────────────────────────────────────────────
  // 3. CLIENTS
  // ─────────────────────────────────────────────
  const mikeUser = await prisma.user.create({
    data: {
      email: "client@logbook.fit",
      passwordHash,
      name: "Mike Chen",
      role: "CLIENT",
      clientProfile: { create: {} },
    },
    include: { clientProfile: true },
  });

  const emmaUser = await prisma.user.create({
    data: {
      email: "emma@demo.logbook.fit",
      passwordHash,
      name: "Emma Wilson",
      role: "CLIENT",
      clientProfile: { create: {} },
    },
    include: { clientProfile: true },
  });

  const alexUser = await prisma.user.create({
    data: {
      email: "alex@demo.logbook.fit",
      passwordHash,
      name: "Alex Rodriguez",
      role: "CLIENT",
      clientProfile: { create: {} },
    },
    include: { clientProfile: true },
  });

  const jordanUser = await prisma.user.create({
    data: {
      email: "jordan@demo.logbook.fit",
      passwordHash,
      name: "Jordan Lee",
      role: "CLIENT",
      clientProfile: { create: {} },
    },
    include: { clientProfile: true },
  });

  // Coach-client relationships
  for (const client of [mikeUser, emmaUser, alexUser, jordanUser]) {
    await prisma.coachClientRelationship.create({
      data: {
        coachId: coachProfileId,
        clientId: client.clientProfile!.id,
        status: "ACTIVE",
      },
    });
  }
  console.log(`✓ 4 clients created & linked to coach`);

  // ─────────────────────────────────────────────
  // 4. PLANS
  // ─────────────────────────────────────────────

  // Plan 1: 4-Week Strength Foundation (assigned to Mike, Alex, Jordan)
  const strengthPlan = await prisma.plan.create({
    data: {
      coachId: coachProfileId,
      name: "4-Week Strength Foundation",
      description: "Progressive strength program for intermediate lifters. Focus on compound movements with linear weight progression.",
      durationWeeks: 4,
    },
  });

  const strengthDays = [
    {
      dayNumber: 1,
      name: "Upper Body Push",
      isRestDay: false,
      exercises: [
        { name: "Barbell Bench Press", sets: 4, reps: 8, weight: 135 },
        { name: "Overhead Press", sets: 3, reps: 8, weight: 95 },
        { name: "Incline Dumbbell Press", sets: 3, reps: 10, weight: 50 },
        { name: "Tricep Pushdown", sets: 3, reps: 12 },
      ],
    },
    {
      dayNumber: 2,
      name: "Lower Body",
      isRestDay: false,
      exercises: [
        { name: "Barbell Back Squat", sets: 4, reps: 6, weight: 185 },
        { name: "Romanian Deadlift", sets: 3, reps: 10, weight: 135 },
        { name: "Leg Press", sets: 3, reps: 12, weight: 270 },
        { name: "Calf Raise", sets: 4, reps: 15 },
      ],
    },
    { dayNumber: 3, name: null, isRestDay: true, exercises: [] as { name: string; sets: number; reps: number; weight?: number }[] },
    {
      dayNumber: 4,
      name: "Upper Body Pull",
      isRestDay: false,
      exercises: [
        { name: "Barbell Row", sets: 4, reps: 8, weight: 135 },
        { name: "Pull-Up", sets: 3, reps: 8 },
        { name: "Face Pull", sets: 3, reps: 15 },
        { name: "Barbell Curl", sets: 3, reps: 10, weight: 65 },
      ],
    },
    {
      dayNumber: 5,
      name: "Lower Body Power",
      isRestDay: false,
      exercises: [
        { name: "Conventional Deadlift", sets: 3, reps: 5, weight: 225 },
        { name: "Bulgarian Split Squat", sets: 3, reps: 10 },
        { name: "Leg Curl", sets: 3, reps: 12 },
        { name: "Hip Thrust", sets: 3, reps: 10, weight: 135 },
      ],
    },
    { dayNumber: 6, name: null, isRestDay: true, exercises: [] as { name: string; sets: number; reps: number; weight?: number }[] },
    { dayNumber: 7, name: null, isRestDay: true, exercises: [] as { name: string; sets: number; reps: number; weight?: number }[] },
  ];

  // Store week/day IDs for later use
  const strengthWeeks: { weekId: string; days: { dayId: string; dayNumber: number; exerciseIds: string[] }[] }[] = [];

  for (let weekNum = 1; weekNum <= 4; weekNum++) {
    const week = await prisma.week.create({
      data: { planId: strengthPlan.id, weekNumber: weekNum },
    });

    const weekDays: { dayId: string; dayNumber: number; exerciseIds: string[] }[] = [];

    for (const tmpl of strengthDays) {
      const day = await prisma.day.create({
        data: {
          weekId: week.id,
          dayNumber: tmpl.dayNumber,
          name: tmpl.name,
          isRestDay: tmpl.isRestDay,
        },
      });

      const weIds: string[] = [];
      for (let i = 0; i < tmpl.exercises.length; i++) {
        const ex = tmpl.exercises[i];
        const exerciseId = exercises[ex.name];
        if (!exerciseId) continue;

        const weightProgression = ex.weight ? ex.weight + (weekNum - 1) * 5 : undefined;

        const we = await prisma.workoutExercise.create({
          data: {
            dayId: day.id,
            exerciseId,
            orderIndex: i,
            sets: ex.sets,
            reps: ex.reps,
            weight: weightProgression,
          },
        });
        weIds.push(we.id);
      }

      weekDays.push({ dayId: day.id, dayNumber: tmpl.dayNumber, exerciseIds: weIds });
    }

    strengthWeeks.push({ weekId: week.id, days: weekDays });
  }
  console.log(`✓ Plan: ${strengthPlan.name} (4 weeks)`);

  // Plan 2: HIIT & Conditioning (assigned to Emma)
  const hiitPlan = await prisma.plan.create({
    data: {
      coachId: coachProfileId,
      name: "HIIT & Conditioning",
      description: "High-intensity interval training program for fat loss and cardiovascular fitness.",
      durationWeeks: 8,
    },
  });

  // Create 2 weeks for HIIT (enough for demo)
  const hiitDays = [
    {
      dayNumber: 1,
      name: "HIIT Circuit A",
      isRestDay: false,
      exercises: [
        { name: "Burpee", sets: 4, reps: 12 },
        { name: "Jump Squat", sets: 4, reps: 20 },
        { name: "Mountain Climber", sets: 4, reps: 20 },
        { name: "Push-Up", sets: 4, reps: 15 },
      ],
    },
    {
      dayNumber: 2,
      name: "HIIT Circuit B",
      isRestDay: false,
      exercises: [
        { name: "Kettlebell Swing", sets: 4, reps: 15 },
        { name: "Box Jump", sets: 4, reps: 12 },
        { name: "Battle Rope", sets: 4, reps: 20 },
        { name: "Plank", sets: 3, reps: 1 },
      ],
    },
    { dayNumber: 3, name: null, isRestDay: true, exercises: [] as { name: string; sets: number; reps: number }[] },
    {
      dayNumber: 4,
      name: "Conditioning",
      isRestDay: false,
      exercises: [
        { name: "Rowing Machine", sets: 5, reps: 1 },
        { name: "Assault Bike", sets: 5, reps: 1 },
      ],
    },
    {
      dayNumber: 5,
      name: "Full Body HIIT",
      isRestDay: false,
      exercises: [
        { name: "Thrusters", sets: 4, reps: 12 },
        { name: "Pull-Up", sets: 4, reps: 8 },
        { name: "Kettlebell Swing", sets: 4, reps: 15 },
      ],
    },
    { dayNumber: 6, name: null, isRestDay: true, exercises: [] as { name: string; sets: number; reps: number }[] },
    { dayNumber: 7, name: null, isRestDay: true, exercises: [] as { name: string; sets: number; reps: number }[] },
  ];

  const hiitWeeks: { weekId: string; days: { dayId: string; dayNumber: number; exerciseIds: string[] }[] }[] = [];

  for (let weekNum = 1; weekNum <= 2; weekNum++) {
    const week = await prisma.week.create({
      data: { planId: hiitPlan.id, weekNumber: weekNum },
    });

    const weekDays: { dayId: string; dayNumber: number; exerciseIds: string[] }[] = [];

    for (const tmpl of hiitDays) {
      const day = await prisma.day.create({
        data: {
          weekId: week.id,
          dayNumber: tmpl.dayNumber,
          name: tmpl.name,
          isRestDay: tmpl.isRestDay,
        },
      });

      const weIds: string[] = [];
      for (let i = 0; i < tmpl.exercises.length; i++) {
        const ex = tmpl.exercises[i];
        const exerciseId = exercises[ex.name];
        if (!exerciseId) {
          console.warn(`  ⚠ Exercise not found: ${ex.name}`);
          continue;
        }

        const we = await prisma.workoutExercise.create({
          data: {
            dayId: day.id,
            exerciseId,
            orderIndex: i,
            sets: ex.sets,
            reps: ex.reps,
          },
        });
        weIds.push(we.id);
      }

      weekDays.push({ dayId: day.id, dayNumber: tmpl.dayNumber, exerciseIds: weIds });
    }

    hiitWeeks.push({ weekId: week.id, days: weekDays });
  }
  console.log(`✓ Plan: ${hiitPlan.name} (2 weeks seeded of 8)`);

  // ─────────────────────────────────────────────
  // 5. ASSIGN PLANS TO CLIENTS
  // ─────────────────────────────────────────────
  // Mike — on week 4 (started 3 weeks ago)
  await prisma.clientProfile.update({
    where: { id: mikeUser.clientProfile!.id },
    data: { activePlanId: strengthPlan.id, planStartDate: daysAgo(21) },
  });

  // Emma — on week 2 (started ~1 week ago)
  await prisma.clientProfile.update({
    where: { id: emmaUser.clientProfile!.id },
    data: { activePlanId: hiitPlan.id, planStartDate: daysAgo(10) },
  });

  // Alex — on week 3 (started 2 weeks ago)
  await prisma.clientProfile.update({
    where: { id: alexUser.clientProfile!.id },
    data: { activePlanId: strengthPlan.id, planStartDate: daysAgo(14) },
  });

  // Jordan — on week 2 (started ~8 days ago, at-risk — hasn't worked out in 6 days)
  await prisma.clientProfile.update({
    where: { id: jordanUser.clientProfile!.id },
    data: { activePlanId: strengthPlan.id, planStartDate: daysAgo(8) },
  });

  console.log(`✓ Plans assigned to all clients`);

  // ─────────────────────────────────────────────
  // 6. WORKOUT COMPLETIONS (with set data)
  // ─────────────────────────────────────────────

  // Helper to create a completion with sets
  async function createCompletion(
    clientId: string,
    planId: string,
    dayId: string,
    workoutExerciseIds: string[],
    opts: {
      completedDaysAgo: number;
      durationMin: number;
      effort: "EASY" | "MEDIUM" | "HARD";
      setsPerExercise?: number;
    }
  ) {
    const completedAt = daysAgo(opts.completedDaysAgo);
    const startedAt = new Date(completedAt.getTime() - opts.durationMin * 60 * 1000);

    const wc = await prisma.workoutCompletion.create({
      data: {
        clientId,
        planId,
        dayId,
        status: "COMPLETED",
        startedAt,
        completedAt,
        completionPct: 1.0,
        exercisesDone: workoutExerciseIds.length,
        exercisesTotal: workoutExerciseIds.length,
        durationSec: opts.durationMin * 60,
        effortRating: opts.effort,
      },
    });

    // Create set completions for each exercise
    for (const weId of workoutExerciseIds) {
      const setsCount = opts.setsPerExercise ?? 3;
      for (let s = 1; s <= setsCount; s++) {
        await prisma.setCompletion.create({
          data: {
            workoutCompletionId: wc.id,
            workoutExerciseId: weId,
            setNumber: s,
            completed: true,
            completedAt,
          },
        });
      }
    }
    return wc;
  }

  // Mike's completions — Weeks 1-3 done, Week 4 Day 1 done yesterday
  const mikeId = mikeUser.clientProfile!.id;
  const sw1 = strengthWeeks[0];
  const sw2 = strengthWeeks[1];
  const sw3 = strengthWeeks[2];
  const sw4 = strengthWeeks[3];

  // Week 1 — all 4 workout days
  for (const dayNum of [1, 2, 4, 5]) {
    const dayInfo = sw1.days.find((d) => d.dayNumber === dayNum)!;
    await createCompletion(mikeId, strengthPlan.id, dayInfo.dayId, dayInfo.exerciseIds, {
      completedDaysAgo: 21 - dayNum + 1,
      durationMin: 40 + Math.floor(Math.random() * 15),
      effort: "MEDIUM",
      setsPerExercise: 4,
    });
  }

  // Week 2 — all 4 workout days
  for (const dayNum of [1, 2, 4, 5]) {
    const dayInfo = sw2.days.find((d) => d.dayNumber === dayNum)!;
    await createCompletion(mikeId, strengthPlan.id, dayInfo.dayId, dayInfo.exerciseIds, {
      completedDaysAgo: 14 - dayNum + 1,
      durationMin: 42 + Math.floor(Math.random() * 10),
      effort: "MEDIUM",
      setsPerExercise: 4,
    });
  }

  // Week 3 — all 4 workout days
  for (const dayNum of [1, 2, 4, 5]) {
    const dayInfo = sw3.days.find((d) => d.dayNumber === dayNum)!;
    await createCompletion(mikeId, strengthPlan.id, dayInfo.dayId, dayInfo.exerciseIds, {
      completedDaysAgo: 7 - dayNum + 1,
      durationMin: 45 + Math.floor(Math.random() * 10),
      effort: dayNum === 5 ? "HARD" : "MEDIUM",
      setsPerExercise: 4,
    });
  }

  // Week 4 — Day 1 done yesterday
  const mikeW4D1 = sw4.days.find((d) => d.dayNumber === 1)!;
  await createCompletion(mikeId, strengthPlan.id, mikeW4D1.dayId, mikeW4D1.exerciseIds, {
    completedDaysAgo: 1,
    durationMin: 42,
    effort: "MEDIUM",
    setsPerExercise: 4,
  });

  console.log(`✓ Mike: 13 workout completions (wk1-3 full + wk4 day 1)`);

  // Emma's completions — Week 1 full, Week 2 partial
  const emmaId = emmaUser.clientProfile!.id;
  const hw1 = hiitWeeks[0];
  const hw2 = hiitWeeks[1];

  for (const dayNum of [1, 2, 4, 5]) {
    const dayInfo = hw1.days.find((d) => d.dayNumber === dayNum)!;
    await createCompletion(emmaId, hiitPlan.id, dayInfo.dayId, dayInfo.exerciseIds, {
      completedDaysAgo: 10 - dayNum,
      durationMin: 35 + Math.floor(Math.random() * 10),
      effort: dayNum <= 2 ? "EASY" : "MEDIUM",
      setsPerExercise: 4,
    });
  }

  // Week 2 — days 1 and 2 done
  for (const dayNum of [1, 2]) {
    const dayInfo = hw2.days.find((d) => d.dayNumber === dayNum)!;
    await createCompletion(emmaId, hiitPlan.id, dayInfo.dayId, dayInfo.exerciseIds, {
      completedDaysAgo: 3 - dayNum + 1,
      durationMin: 38,
      effort: "MEDIUM",
      setsPerExercise: 4,
    });
  }

  console.log(`✓ Emma: 6 workout completions`);

  // Alex's completions — Week 1 full, Week 2 only 3 days (missed one)
  const alexId = alexUser.clientProfile!.id;

  for (const dayNum of [1, 2, 4, 5]) {
    const dayInfo = sw1.days.find((d) => d.dayNumber === dayNum)!;
    await createCompletion(alexId, strengthPlan.id, dayInfo.dayId, dayInfo.exerciseIds, {
      completedDaysAgo: 14 - dayNum + 1,
      durationMin: 50 + Math.floor(Math.random() * 10),
      effort: "MEDIUM",
      setsPerExercise: 4,
    });
  }

  for (const dayNum of [1, 2, 4]) {
    const dayInfo = sw2.days.find((d) => d.dayNumber === dayNum)!;
    await createCompletion(alexId, strengthPlan.id, dayInfo.dayId, dayInfo.exerciseIds, {
      completedDaysAgo: 7 - dayNum + 1,
      durationMin: 48,
      effort: dayNum === 4 ? "HARD" : "MEDIUM",
      setsPerExercise: 4,
    });
  }

  // Most recent — yesterday
  const alexRecent = sw3.days.find((d) => d.dayNumber === 1)!;
  await createCompletion(alexId, strengthPlan.id, alexRecent.dayId, alexRecent.exerciseIds, {
    completedDaysAgo: 1,
    durationMin: 55,
    effort: "MEDIUM",
    setsPerExercise: 4,
  });

  console.log(`✓ Alex: 8 workout completions`);

  // Jordan — only 2 completions, last one 6 days ago (at-risk)
  const jordanId = jordanUser.clientProfile!.id;

  const jordanD1 = sw1.days.find((d) => d.dayNumber === 1)!;
  const jordanD2 = sw1.days.find((d) => d.dayNumber === 2)!;

  await createCompletion(jordanId, strengthPlan.id, jordanD1.dayId, jordanD1.exerciseIds, {
    completedDaysAgo: 8,
    durationMin: 35,
    effort: "HARD",
    setsPerExercise: 3,
  });

  await createCompletion(jordanId, strengthPlan.id, jordanD2.dayId, jordanD2.exerciseIds, {
    completedDaysAgo: 6,
    durationMin: 30,
    effort: "HARD",
    setsPerExercise: 3,
  });

  console.log(`✓ Jordan: 2 workout completions (last 6 days ago — at risk)`);

  // ─────────────────────────────────────────────
  // 7. CHECK-INS
  // ─────────────────────────────────────────────

  // Mike — 3 completed + 1 awaiting coach review
  await prisma.checkIn.create({
    data: {
      coachId: coachProfileId,
      clientId: mikeId,
      status: "COMPLETED",
      effortRating: "EASY",
      clientFeeling: "Felt great this week. The weights are manageable — maybe time to bump up?",
      painBlockers: null,
      clientRespondedAt: daysAgo(18),
      coachFeedback: "Great to hear! I've bumped your bench by 10 lbs starting next week. Keep the form tight.",
      planAdjustment: true,
      coachRespondedAt: daysAgo(17),
      completedAt: daysAgo(17),
      createdAt: daysAgo(19),
    },
  });

  await prisma.checkIn.create({
    data: {
      coachId: coachProfileId,
      clientId: mikeId,
      status: "COMPLETED",
      effortRating: "MEDIUM",
      clientFeeling: "Good week overall. Hit a bench PR at 145 lbs! Squat felt solid too.",
      painBlockers: null,
      clientRespondedAt: daysAgo(11),
      coachFeedback: "That's a 10 lb PR on bench — awesome progress! Keep the squat form dialed in at this weight before we move up.",
      planAdjustment: false,
      coachRespondedAt: daysAgo(10),
      completedAt: daysAgo(10),
      createdAt: daysAgo(12),
    },
  });

  await prisma.checkIn.create({
    data: {
      coachId: coachProfileId,
      clientId: mikeId,
      status: "COMPLETED",
      effortRating: "HARD",
      clientFeeling: "Tough week. Felt tired going into deadlifts. Lower back was a bit tight after the session.",
      painBlockers: "Lower back tightness after deadlifts on Day 5",
      clientRespondedAt: daysAgo(4),
      coachFeedback: "Let's reduce deadlift volume to 3x3 next week and add cat-cow stretches to your warm-up. If the tightness persists, let me know and we'll adjust further.",
      planAdjustment: true,
      coachRespondedAt: daysAgo(3),
      completedAt: daysAgo(3),
      createdAt: daysAgo(5),
    },
  });

  // Current check-in — client responded, awaiting coach review
  await prisma.checkIn.create({
    data: {
      coachId: coachProfileId,
      clientId: mikeId,
      status: "CLIENT_RESPONDED",
      effortRating: "MEDIUM",
      clientFeeling: "This week went great! Bench is at 155 — that's another PR. The back stretches you recommended are helping a lot.",
      painBlockers: null,
      clientRespondedAt: hoursAgo(6),
      createdAt: daysAgo(1),
    },
  });

  console.log(`✓ Mike: 4 check-ins (3 completed, 1 awaiting coach review)`);

  // Emma — 1 completed
  await prisma.checkIn.create({
    data: {
      coachId: coachProfileId,
      clientId: emmaId,
      status: "COMPLETED",
      effortRating: "MEDIUM",
      clientFeeling: "Really enjoying the HIIT circuits! Could I add an extra session on Saturdays?",
      painBlockers: null,
      clientRespondedAt: daysAgo(5),
      coachFeedback: "I love the enthusiasm! Let's hold off on adding a 5th day for now — your body needs time to adapt. We'll reassess after week 4.",
      planAdjustment: false,
      coachRespondedAt: daysAgo(4),
      completedAt: daysAgo(4),
      createdAt: daysAgo(6),
    },
  });

  console.log(`✓ Emma: 1 check-in (completed)`);

  // Alex — 2 completed
  await prisma.checkIn.create({
    data: {
      coachId: coachProfileId,
      clientId: alexId,
      status: "COMPLETED",
      effortRating: "HARD",
      clientFeeling: "Struggled this week. Work has been stressful and I missed a session.",
      painBlockers: "General fatigue from work stress",
      clientRespondedAt: daysAgo(8),
      coachFeedback: "No worries about the missed session — life happens. Focus on the sessions you do make and keep the quality high. Consider a 5-min walk before training to reset.",
      planAdjustment: false,
      coachRespondedAt: daysAgo(7),
      completedAt: daysAgo(7),
      createdAt: daysAgo(9),
    },
  });

  await prisma.checkIn.create({
    data: {
      coachId: coachProfileId,
      clientId: alexId,
      status: "COMPLETED",
      effortRating: "MEDIUM",
      clientFeeling: "Much better this week. Got back on track with all sessions. The pre-workout walk tip is a game changer.",
      painBlockers: null,
      clientRespondedAt: daysAgo(2),
      coachFeedback: "That's great to hear! Consistency > perfection. Let's keep this momentum going.",
      planAdjustment: false,
      coachRespondedAt: daysAgo(1),
      completedAt: daysAgo(1),
      createdAt: daysAgo(3),
    },
  });

  console.log(`✓ Alex: 2 check-ins (completed)`);

  // Jordan — 1 pending (no response yet)
  await prisma.checkIn.create({
    data: {
      coachId: coachProfileId,
      clientId: jordanId,
      status: "PENDING",
      createdAt: daysAgo(2),
    },
  });

  console.log(`✓ Jordan: 1 check-in (pending — no response)`);

  // ─────────────────────────────────────────────
  // 8. MESSAGES
  // ─────────────────────────────────────────────

  // Mike <-> Coach — rich conversation
  const mikeMessages = [
    { from: "client", content: "Hey Sarah! Just wanted to let you know I set up a small home gym in my garage. Got a rack, barbell, and adjustable dumbbells.", daysAgo: 20 },
    { from: "coach", content: "That's awesome Mike! Having your own setup will make it so much easier to stay consistent. How's the space?", daysAgo: 20 },
    { from: "client", content: "It's perfect. Enough room for everything. Also picked up some bumper plates so I can deadlift without worrying about noise.", daysAgo: 19 },
    { from: "coach", content: "Love it! Quick tip — make sure you have enough clearance overhead for the press. Some garage ceilings are tight.", daysAgo: 19 },
    { from: "client", content: "Good call, I have about 8 feet. Should be fine for OHP. Quick question about squats — should I be going below parallel?", daysAgo: 17 },
    { from: "coach", content: "Great question! Yes, aim for just below parallel — hip crease below knee cap. If mobility is limiting you, we can add some ankle mobility drills to your warm-up.", daysAgo: 17 },
    { from: "client", content: "Got it. I've been watching my form on video and I think my knees cave in a bit at the bottom.", daysAgo: 15 },
    { from: "coach", content: "That's common and usually a cue issue. Try 'screwing your feet into the floor' — externally rotate as you descend. Also, try a slightly wider stance.", daysAgo: 15 },
    { from: "client", content: "Tried the wider stance today and it felt SO much better. Knees tracked over toes perfectly. Thanks!", daysAgo: 13 },
    { from: "coach", content: "Excellent! That's the kind of feedback I love. Keep filming your sets when you can — it's the best way to self-check.", daysAgo: 13 },
    { from: "client", content: "Had a rough session today. Missed my last rep on bench at 145. Felt like my right arm gave out first.", daysAgo: 10 },
    { from: "coach", content: "That happens. If one arm is lagging, try adding a set of single-arm dumbbell press at the end of push day. It'll even things out over time.", daysAgo: 10 },
    { from: "client", content: "Will do! Also, any tips on pre-workout nutrition? I've been training fasted in the morning and running out of steam.", daysAgo: 8 },
    { from: "coach", content: "Try a small meal 60-90 min before — something like oatmeal with banana, or toast with peanut butter. Even a protein shake 30 min before can make a big difference.", daysAgo: 8 },
    { from: "client", content: "Tried the oatmeal + banana before today's session. Night and day difference. Had way more energy through the whole workout.", daysAgo: 6 },
    { from: "coach", content: "Nutrition is the easiest performance hack! Glad it helped. How's the shoulder feeling with the overhead press?", daysAgo: 6 },
    { from: "client", content: "Actually, I noticed a slight pinch in my left shoulder at the top of OHP. Not painful, just uncomfortable.", daysAgo: 5 },
    { from: "coach", content: "Let's swap OHP for seated dumbbell press for the next 2 weeks. DBs let your shoulders find their natural groove. Also add band pull-aparts to warm up — 2x15.", daysAgo: 5 },
    { from: "client", content: "Did DB press today — felt much better on the shoulders. Also hit a bench PR at 155! That's a 10 lb jump since we started!", daysAgo: 2 },
    { from: "coach", content: "155! That's incredible progress in 3 weeks. Your consistency is paying off big time. Let's keep the DB press for now and reassess the shoulder next week.", daysAgo: 2 },
    { from: "client", content: "Thanks Sarah! Honestly this is the most structured I've ever been with training. Having a coach makes a huge difference.", daysAgo: 1, unread: true },
  ];

  for (const msg of mikeMessages) {
    const senderId = msg.from === "client" ? mikeUser.id : coachUser.id;
    const recipientId = msg.from === "client" ? coachUser.id : mikeUser.id;
    const isUnread = "unread" in msg && msg.unread;
    await prisma.message.create({
      data: {
        senderId,
        recipientId,
        content: msg.content,
        readAt: isUnread ? null : daysAgo(msg.daysAgo),
        createdAt: daysAgo(msg.daysAgo),
      },
    });
  }

  console.log(`✓ Mike: ${mikeMessages.length} messages (1 unread)`);

  // Emma <-> Coach
  const emmaMessages = [
    { from: "client", content: "Hi Sarah! Just finished my first HIIT circuit — those burpees are no joke!", daysAgo: 9 },
    { from: "coach", content: "Ha! They never get easier, you just get faster at them. How did you feel overall? Any exercises that felt too intense?", daysAgo: 9 },
    { from: "client", content: "The mountain climbers were tough but manageable. I modified the jump squats to regular squats for the last set.", daysAgo: 8 },
    { from: "coach", content: "Smart move on the modification. That's exactly what you should do — maintain form over intensity. The jump squats will come!", daysAgo: 8 },
    { from: "client", content: "Quick question — is it normal for my heart rate to stay elevated for like 20 min after the workout?", daysAgo: 4 },
    { from: "coach", content: "Totally normal for HIIT! That's called EPOC (excess post-exercise oxygen consumption). Your body is burning extra calories while recovering. It's a sign the workout was effective.", daysAgo: 4 },
  ];

  for (const msg of emmaMessages) {
    const senderId = msg.from === "client" ? emmaUser.id : coachUser.id;
    const recipientId = msg.from === "client" ? coachUser.id : emmaUser.id;
    await prisma.message.create({
      data: {
        senderId,
        recipientId,
        content: msg.content,
        readAt: daysAgo(msg.daysAgo),
        createdAt: daysAgo(msg.daysAgo),
      },
    });
  }

  console.log(`✓ Emma: ${emmaMessages.length} messages`);

  // Alex <-> Coach
  const alexMessages = [
    { from: "client", content: "Hey Sarah, sorry I missed Thursday's session. Work has been crazy with the project deadline.", daysAgo: 8 },
    { from: "coach", content: "No worries at all, Alex! Missing a session here and there is totally fine. What matters is getting back on track. Can you make it up this weekend?", daysAgo: 8 },
    { from: "client", content: "Yeah, I'll do the pull day on Saturday. Thanks for being understanding!", daysAgo: 7 },
    { from: "coach", content: "Of course! Life happens. The best program is the one you can stick to. Let me know how Saturday goes.", daysAgo: 7 },
    { from: "client", content: "Saturday session was solid! Also started doing the pre-workout walks you suggested. Really helps clear my head before training.", daysAgo: 5 },
    { from: "coach", content: "The walks are a game changer for stress management. Even 5 minutes of fresh air can shift your mindset. Glad it's working!", daysAgo: 5 },
  ];

  for (const msg of alexMessages) {
    const senderId = msg.from === "client" ? alexUser.id : coachUser.id;
    const recipientId = msg.from === "client" ? coachUser.id : alexUser.id;
    await prisma.message.create({
      data: {
        senderId,
        recipientId,
        content: msg.content,
        readAt: daysAgo(msg.daysAgo),
        createdAt: daysAgo(msg.daysAgo),
      },
    });
  }

  console.log(`✓ Alex: ${alexMessages.length} messages`);

  // Jordan <-> Coach — concern messages
  const jordanMessages = [
    { from: "coach", content: "Hey Jordan! I noticed you haven't logged a workout in a few days. Everything okay?", daysAgo: 3 },
    { from: "client", content: "Yeah, I've been dealing with some personal stuff. I'll try to get back in this week.", daysAgo: 2 },
    { from: "coach", content: "No pressure at all. Take the time you need. When you're ready, even a lighter session can help. I'm here if you want to talk or adjust the program.", daysAgo: 2 },
  ];

  for (const msg of jordanMessages) {
    const senderId = msg.from === "client" ? jordanUser.id : coachUser.id;
    const recipientId = msg.from === "client" ? coachUser.id : jordanUser.id;
    await prisma.message.create({
      data: {
        senderId,
        recipientId,
        content: msg.content,
        readAt: msg.from === "coach" ? null : daysAgo(msg.daysAgo),
        createdAt: daysAgo(msg.daysAgo),
      },
    });
  }

  console.log(`✓ Jordan: ${jordanMessages.length} messages`);

  // ─────────────────────────────────────────────
  // 9. EXERCISE FLAGS
  // ─────────────────────────────────────────────

  // Mike flagged OHP during a workout (shoulder pinch)
  const mikeW3D1 = sw3.days.find((d) => d.dayNumber === 1)!;
  const mikeW3D1Completion = await prisma.workoutCompletion.findFirst({
    where: { clientId: mikeId, dayId: mikeW3D1.dayId },
  });

  if (mikeW3D1Completion && mikeW3D1.exerciseIds[1]) {
    await prisma.exerciseFlag.create({
      data: {
        workoutCompletionId: mikeW3D1Completion.id,
        workoutExerciseId: mikeW3D1.exerciseIds[1], // OHP is index 1
        note: "Slight pinch in left shoulder at top of movement",
      },
    });
    console.log(`✓ Mike: 1 exercise flag (OHP shoulder pinch)`);
  }

  // ─────────────────────────────────────────────
  // DONE
  // ─────────────────────────────────────────────
  console.log("\n✅ Seed complete!");
  console.log("─────────────────────────────────────");
  console.log("  Coach:   coach@logbook.fit / demo1234  (Sarah Johnson)");
  console.log("  Client:  client@logbook.fit / demo1234  (Mike Chen)");
  console.log("  Client:  emma@demo.logbook.fit / demo1234  (Emma Wilson)");
  console.log("  Client:  alex@demo.logbook.fit / demo1234  (Alex Rodriguez)");
  console.log("  Client:  jordan@demo.logbook.fit / demo1234  (Jordan Lee)");
  console.log("─────────────────────────────────────\n");
}

seed()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

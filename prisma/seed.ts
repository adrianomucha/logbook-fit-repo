import { PrismaClient, ExerciseCategory } from "../generated/prisma";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const QUICK_START_EXERCISES: {
  name: string;
  category: ExerciseCategory;
  defaultSets: number;
  defaultReps: number;
  defaultRest?: number;
}[] = [
  { name: "Barbell Bench Press", category: "CHEST", defaultSets: 4, defaultReps: 8 },
  { name: "Incline Dumbbell Press", category: "CHEST", defaultSets: 3, defaultReps: 10 },
  { name: "Barbell Back Squat", category: "LEGS", defaultSets: 4, defaultReps: 6 },
  { name: "Romanian Deadlift", category: "LEGS", defaultSets: 3, defaultReps: 10 },
  { name: "Leg Press", category: "LEGS", defaultSets: 3, defaultReps: 12 },
  { name: "Conventional Deadlift", category: "BACK", defaultSets: 3, defaultReps: 5 },
  { name: "Barbell Row", category: "BACK", defaultSets: 4, defaultReps: 8 },
  { name: "Lat Pulldown", category: "BACK", defaultSets: 3, defaultReps: 10 },
  { name: "Overhead Press", category: "SHOULDERS", defaultSets: 3, defaultReps: 8 },
  { name: "Lateral Raise", category: "SHOULDERS", defaultSets: 3, defaultReps: 15 },
  { name: "Barbell Curl", category: "BICEPS", defaultSets: 3, defaultReps: 10 },
  { name: "Hammer Curl", category: "BICEPS", defaultSets: 3, defaultReps: 12 },
  { name: "Tricep Pushdown", category: "TRICEPS", defaultSets: 3, defaultReps: 12 },
  { name: "Overhead Tricep Extension", category: "TRICEPS", defaultSets: 3, defaultReps: 10 },
  { name: "Hip Thrust", category: "GLUTES", defaultSets: 3, defaultReps: 10 },
  { name: "Bulgarian Split Squat", category: "LEGS", defaultSets: 3, defaultReps: 10 },
  { name: "Cable Row", category: "BACK", defaultSets: 3, defaultReps: 12 },
  { name: "Face Pull", category: "SHOULDERS", defaultSets: 3, defaultReps: 15 },
  { name: "Plank", category: "CORE", defaultSets: 3, defaultReps: 60, defaultRest: 30 },
  { name: "Cable Crunch", category: "CORE", defaultSets: 3, defaultReps: 15 },
  { name: "Pull-Up", category: "BACK", defaultSets: 3, defaultReps: 8 },
  { name: "Dumbbell Bench Press", category: "CHEST", defaultSets: 3, defaultReps: 10 },
  { name: "Leg Curl", category: "LEGS", defaultSets: 3, defaultReps: 12 },
  { name: "Leg Extension", category: "LEGS", defaultSets: 3, defaultReps: 12 },
  { name: "Calf Raise", category: "LEGS", defaultSets: 4, defaultReps: 15 },
];

async function seed() {
  console.log("Seeding database...");

  // 1. Create demo coach
  const coachUser = await prisma.user.create({
    data: {
      email: "coach@logbook.fit",
      passwordHash: await bcrypt.hash("demo1234", 10),
      name: "Demo Coach",
      role: "COACH",
      coachProfile: { create: { bio: "Strength & conditioning coach" } },
    },
    include: { coachProfile: true },
  });

  const coachProfileId = coachUser.coachProfile!.id;
  console.log(`Created coach: ${coachUser.email} (profile: ${coachProfileId})`);

  // 2. Pre-load Quick Start exercise library
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
  console.log(`Created ${QUICK_START_EXERCISES.length} exercises`);

  // 3. Create demo client
  const clientUser = await prisma.user.create({
    data: {
      email: "client@logbook.fit",
      passwordHash: await bcrypt.hash("demo1234", 10),
      name: "Demo Client",
      role: "CLIENT",
      clientProfile: { create: {} },
    },
    include: { clientProfile: true },
  });

  console.log(`Created client: ${clientUser.email}`);

  // 4. Create coach-client relationship
  await prisma.coachClientRelationship.create({
    data: {
      coachId: coachProfileId,
      clientId: clientUser.clientProfile!.id,
      status: "ACTIVE",
    },
  });
  console.log("Created coach-client relationship");

  // 5. Create a sample 4-week plan
  const plan = await prisma.plan.create({
    data: {
      coachId: coachProfileId,
      name: "4-Week Strength Foundation",
      description: "Progressive strength program for intermediate lifters",
      durationWeeks: 4,
    },
  });
  console.log(`Created plan: ${plan.name}`);

  // Day templates for a week
  const dayTemplates = [
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
    { dayNumber: 3, name: null, isRestDay: true, exercises: [] },
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
      name: "Lower Body",
      isRestDay: false,
      exercises: [
        { name: "Conventional Deadlift", sets: 3, reps: 5, weight: 225 },
        { name: "Bulgarian Split Squat", sets: 3, reps: 10 },
        { name: "Leg Curl", sets: 3, reps: 12 },
        { name: "Hip Thrust", sets: 3, reps: 10, weight: 135 },
      ],
    },
    { dayNumber: 6, name: null, isRestDay: true, exercises: [] },
    { dayNumber: 7, name: null, isRestDay: true, exercises: [] },
  ];

  // Create 4 weeks with progressive overload
  for (let weekNum = 1; weekNum <= 4; weekNum++) {
    const week = await prisma.week.create({
      data: { planId: plan.id, weekNumber: weekNum },
    });

    for (const dayTemplate of dayTemplates) {
      const day = await prisma.day.create({
        data: {
          weekId: week.id,
          dayNumber: dayTemplate.dayNumber,
          name: dayTemplate.name,
          isRestDay: dayTemplate.isRestDay,
        },
      });

      // Add exercises to non-rest days
      for (let i = 0; i < dayTemplate.exercises.length; i++) {
        const ex = dayTemplate.exercises[i];
        const exerciseId = exercises[ex.name];
        if (!exerciseId) {
          console.warn(`Exercise not found in library: ${ex.name}`);
          continue;
        }

        // Progressive overload: add 5 lbs per week to main lifts
        const weightProgression = ex.weight
          ? ex.weight + (weekNum - 1) * 5
          : undefined;

        await prisma.workoutExercise.create({
          data: {
            dayId: day.id,
            exerciseId,
            orderIndex: i,
            sets: ex.sets,
            reps: ex.reps,
            weight: weightProgression,
          },
        });
      }
    }
    console.log(`Created week ${weekNum} with days and exercises`);
  }

  // 6. Assign plan to client
  await prisma.clientProfile.update({
    where: { id: clientUser.clientProfile!.id },
    data: { activePlanId: plan.id, planStartDate: new Date() },
  });
  console.log("Assigned plan to client");

  console.log("\nSeed complete!");
  console.log(`  Coach: coach@logbook.fit / demo1234`);
  console.log(`  Client: client@logbook.fit / demo1234`);
}

seed()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

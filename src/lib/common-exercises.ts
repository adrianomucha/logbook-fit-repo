import type { CoachExercise } from '@/types';

/**
 * Complete exercise library for quick-start onboarding
 * These will be offered to coaches on their first time setting up their library
 */
export function generateCommonExercises(coachId: string): CoachExercise[] {
  const now = new Date().toISOString();
  let idCounter = 1;

  const createExercise = (name: string, category: any, equipment: any, sets: number, notes: string = ''): CoachExercise => ({
    id: `ex-${Date.now()}-${idCounter++}`,
    coachId,
    name,
    category,
    equipment,
    defaultSets: sets,
    notes,
    usageCount: 0,
    createdAt: now,
    updatedAt: now,
  });

  return [
    // Chest (7 exercises)
    createExercise('Barbell Bench Press', 'UPPER_BODY', 'BARBELL', 4, 'Keep elbows at 45 degrees'),
    createExercise('Incline Bench Press', 'UPPER_BODY', 'BARBELL', 3, 'Focus on upper chest'),
    createExercise('Dumbbell Bench Press', 'UPPER_BODY', 'DUMBBELL', 4),
    createExercise('Dumbbell Flyes', 'UPPER_BODY', 'DUMBBELL', 3),
    createExercise('Cable Flyes', 'UPPER_BODY', 'CABLE', 3),
    createExercise('Push-ups', 'UPPER_BODY', 'BODYWEIGHT', 3),
    createExercise('Dips (Chest)', 'UPPER_BODY', 'BODYWEIGHT', 3),

    // Back (7 exercises)
    createExercise('Deadlift', 'UPPER_BODY', 'BARBELL', 4, 'Keep back straight, drive through heels'),
    createExercise('Pull-ups', 'UPPER_BODY', 'BODYWEIGHT', 3),
    createExercise('Barbell Rows', 'UPPER_BODY', 'BARBELL', 4, 'Keep back flat, pull to lower chest'),
    createExercise('Dumbbell Rows', 'UPPER_BODY', 'DUMBBELL', 3),
    createExercise('Lat Pulldown', 'UPPER_BODY', 'CABLE', 3),
    createExercise('Cable Rows', 'UPPER_BODY', 'CABLE', 3),
    createExercise('T-Bar Row', 'UPPER_BODY', 'MACHINE', 3),

    // Shoulders (6 exercises)
    createExercise('Overhead Press', 'UPPER_BODY', 'BARBELL', 4, 'Brace core, press straight up'),
    createExercise('Dumbbell Shoulder Press', 'UPPER_BODY', 'DUMBBELL', 3),
    createExercise('Lateral Raises', 'UPPER_BODY', 'DUMBBELL', 3),
    createExercise('Front Raises', 'UPPER_BODY', 'DUMBBELL', 3),
    createExercise('Rear Delt Flyes', 'UPPER_BODY', 'DUMBBELL', 3),
    createExercise('Face Pulls', 'UPPER_BODY', 'CABLE', 3),

    // Arms (7 exercises)
    createExercise('Barbell Curl', 'UPPER_BODY', 'BARBELL', 3),
    createExercise('Dumbbell Curl', 'UPPER_BODY', 'DUMBBELL', 3),
    createExercise('Hammer Curls', 'UPPER_BODY', 'DUMBBELL', 3),
    createExercise('Tricep Dips', 'UPPER_BODY', 'BODYWEIGHT', 3),
    createExercise('Tricep Pushdown', 'UPPER_BODY', 'CABLE', 3),
    createExercise('Skull Crushers', 'UPPER_BODY', 'BARBELL', 3),
    createExercise('Close-Grip Bench Press', 'UPPER_BODY', 'BARBELL', 3),

    // Legs (7 exercises)
    createExercise('Barbell Squat', 'LOWER_BODY', 'BARBELL', 4, 'Depth to parallel or below'),
    createExercise('Leg Press', 'LOWER_BODY', 'MACHINE', 3),
    createExercise('Romanian Deadlift', 'LOWER_BODY', 'BARBELL', 3, 'Hinge at hips, slight knee bend'),
    createExercise('Leg Curl', 'LOWER_BODY', 'MACHINE', 3),
    createExercise('Leg Extension', 'LOWER_BODY', 'MACHINE', 3),
    createExercise('Walking Lunges', 'LOWER_BODY', 'DUMBBELL', 3),
    createExercise('Calf Raises', 'LOWER_BODY', 'MACHINE', 4, 'Full range of motion'),

    // Core (5 exercises)
    createExercise('Plank', 'CORE', 'BODYWEIGHT', 3, 'Hold for 30-60 seconds'),
    createExercise('Crunches', 'CORE', 'BODYWEIGHT', 3),
    createExercise('Russian Twists', 'CORE', 'BODYWEIGHT', 3),
    createExercise('Hanging Leg Raises', 'CORE', 'BODYWEIGHT', 3),
    createExercise('Ab Wheel Rollout', 'CORE', 'OTHER', 3),

    // Cardio (5 exercises)
    createExercise('Treadmill Run', 'CARDIO', 'MACHINE', 1, '20-30 minutes'),
    createExercise('Stationary Bike', 'CARDIO', 'MACHINE', 1, '20-30 minutes'),
    createExercise('Burpees', 'CARDIO', 'BODYWEIGHT', 4),
    createExercise('Jump Rope', 'CARDIO', 'OTHER', 3, '2 minutes'),
    createExercise('Mountain Climbers', 'CARDIO', 'BODYWEIGHT', 3),
  ];
}

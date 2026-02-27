/**
 * Quick Start exercises that every new coach gets in their library.
 * Used by both:
 *  - POST /api/auth/signup  (when a coach signs up)
 *  - prisma/seed.ts         (demo data)
 *
 * Single source of truth — edit this list to change the default library.
 */

export type QuickStartExercise = {
  name: string;
  /** Must match the ExerciseCategory enum values */
  category: "CHEST" | "BACK" | "SHOULDERS" | "BICEPS" | "TRICEPS" | "LEGS" | "GLUTES" | "CORE" | "CARDIO" | "FULL_BODY" | "OTHER";
  defaultSets: number;
  defaultReps: number;
  defaultRest?: number;
};

export const QUICK_START_EXERCISES: QuickStartExercise[] = [
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

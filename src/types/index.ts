export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps?: string;
  time?: string;
  weight?: string;
  notes?: string;
  completed?: boolean;
}

export interface WorkoutDay {
  id: string;
  name: string;
  exercises: Exercise[];
  isRestDay?: boolean;
}

export interface WorkoutWeek {
  id: string;
  weekNumber: number;
  days: WorkoutDay[];
}

export interface WorkoutPlan {
  id: string;
  name: string;
  description?: string;
  emoji?: string;
  durationWeeks?: number;
  workoutsPerWeek?: number;
  weeks: WorkoutWeek[];
  createdAt: string;
  updatedAt: string;
  // Template/Instance model fields
  isTemplate?: boolean;        // true = template (shown on Plans page), false/undefined = instance
  sourceTemplateId?: string;   // for instances: which template it was forked from
  archivedAt?: string;         // ISO date for soft delete (archive)
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
  read: boolean;
  clientId: string;  // The client this message belongs to (for data isolation)
  // Optional exercise context when message is sent about a flagged exercise
  exerciseContext?: {
    exerciseId: string;
    exerciseName: string;
    prescription: string;     // "4x 8-10 @ 135 lbs"
    setsCompleted: number;
    totalSets: number;
    flagNote?: string;
  };
}

export type WorkoutFeeling = 'TOO_EASY' | 'ABOUT_RIGHT' | 'TOO_HARD';
export type BodyFeeling = 'FRESH' | 'NORMAL' | 'TIRED' | 'RUN_DOWN';
export type CheckInStatus = 'pending' | 'responded' | 'completed';

export interface CheckIn {
  id: string;
  clientId: string;
  coachId: string;
  date: string;
  status: CheckInStatus;

  // Client response fields (populated when status: pending → responded)
  workoutFeeling?: WorkoutFeeling;
  bodyFeeling?: BodyFeeling;
  clientNotes?: string;
  flaggedWorkoutId?: string;
  flaggedWorkoutNote?: string;
  clientRespondedAt?: string;

  // Coach response fields (populated when status: responded → completed)
  coachResponse?: string;
  planAdjustment?: boolean;
  completedAt?: string;

  // Legacy field for backward compat
  notes?: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  currentPlanId?: string;
  lastWorkoutDate?: string;
  adherenceRate?: number;
  status: 'active' | 'inactive';
  avatar?: string;
  lastCheckInDate?: string;
  planStartDate?: string;  // ISO date when plan was assigned
}

export interface Coach {
  id: string;
  name: string;
  email: string;
  clients: string[];
}

export interface CompletedWorkout {
  id: string;
  clientId: string;
  planId: string;
  weekId: string;
  dayId: string;
  completedAt: string;
  exercises: Exercise[];
}

// Workout completion status for granular tracking
export type WorkoutCompletionStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

// Day status for weekly overview
export type DayStatus = 'TODAY' | 'COMPLETED' | 'UPCOMING' | 'MISSED' | 'REST';

// Effort rating for post-workout feedback
export type EffortRating = 'EASY' | 'MEDIUM' | 'HARD';

// Granular workout completion (enhanced version of CompletedWorkout)
export interface WorkoutCompletion {
  id: string;
  clientId: string;
  planId: string;
  weekId: string;
  dayId: string;
  status: WorkoutCompletionStatus;
  startedAt?: string;
  completedAt?: string;
  completionPct: number;      // 0-100
  exercisesDone: number;
  exercisesTotal: number;
  durationSec?: number;
  effortRating?: EffortRating;  // Optional post-workout feedback
}

// Set-level completion tracking
export interface SetCompletion {
  id: string;
  workoutCompletionId: string;
  exerciseId: string;
  setNumber: number;          // 1-indexed
  completed: boolean;
  actualWeight?: string;
  actualReps?: string;
  completedAt?: string;
}

// Exercise-level flag during workout
export interface ExerciseFlag {
  id: string;
  workoutCompletionId: string;
  exerciseId: string;
  note?: string;              // Optional 200 char max note
  flaggedAt: string;          // ISO timestamp
}

export interface Measurement {
  id: string;
  clientId: string;
  date: string;
  weight?: number;
  bodyFat?: number;
  chest?: number;
  waist?: number;
  hips?: number;
  biceps?: number;
  thighs?: number;
  notes?: string;
}

// Check-in schedule types (TASK-053)
export type CheckInScheduleStatus = 'ACTIVE' | 'PAUSED' | 'INACTIVE';

export interface CheckInSchedule {
  id: string;
  coachId: string;
  clientId: string;
  status: CheckInScheduleStatus;
  cadence: 'WEEKLY';
  anchorDate: string;         // ISO date — reference point for 7-day cycle
  createdAt: string;
  updatedAt: string;
}

export type Role = 'coach' | 'client';

export interface AppState {
  currentRole: Role;
  currentUserId: string;
  coaches: Coach[];
  clients: Client[];
  plans: WorkoutPlan[];
  messages: Message[];
  completedWorkouts: CompletedWorkout[];
  measurements: Measurement[];
  checkIns: CheckIn[];
  coachExercises: CoachExercise[];
  workoutCompletions: WorkoutCompletion[];
  setCompletions: SetCompletion[];
  exerciseFlags: ExerciseFlag[];
  checkInSchedules: CheckInSchedule[];
  // Migration flags
  checkInSchedulesMigrationV1?: boolean;
  alexMigrationV4?: boolean;
  messagesMigrationV2?: boolean;
  workoutCompletionsMigrationV2?: boolean;
  mikeWorkoutTodayMigration?: boolean;
}

// Plan Setup Form Types
export interface PlanSetupFormData {
  name: string;
  description: string;
  emoji: string;
  durationWeeks: number;
  workoutsPerWeek: number;
}

export interface PlanSetupFormErrors {
  name?: string;
  description?: string;
  durationWeeks?: string;
  workoutsPerWeek?: string;
}

// Exercise Library Types
export type ExerciseCategory =
  | 'UPPER_BODY'
  | 'LOWER_BODY'
  | 'CORE'
  | 'CARDIO'
  | 'MOBILITY'
  | 'OTHER';

export type ExerciseEquipment =
  | 'BARBELL'
  | 'DUMBBELL'
  | 'KETTLEBELL'
  | 'BODYWEIGHT'
  | 'MACHINE'
  | 'CABLE'
  | 'BANDS'
  | 'OTHER';

export interface CoachExercise {
  id: string;
  coachId: string;
  name: string;
  category: ExerciseCategory;
  equipment: ExerciseEquipment;
  defaultSets: number;
  notes?: string;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ExerciseFormData {
  name: string;
  category: ExerciseCategory;
  equipment: ExerciseEquipment;
  defaultSets: number;
  notes: string;
}

export interface ExerciseFormErrors {
  name?: string;
  category?: string;
  equipment?: string;
  defaultSets?: string;
  notes?: string;
}

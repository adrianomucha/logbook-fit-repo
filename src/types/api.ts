/** Response types matching the database API endpoints */

// GET /api/coach/dashboard
export interface DashboardClient {
  clientProfileId: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
  };
  activePlan: {
    id: string;
    name: string;
  } | null;
  lastWorkoutAt: string | null;
  pendingCheckIn: {
    id: string;
    status: string;
    createdAt: string;
  } | null;
  urgency: 'AT_RISK' | 'AWAITING_RESPONSE' | 'CHECKIN_DUE' | 'ON_TRACK';
  urgencyOrder: number;
}

// GET /api/plans
export interface PlanSummary {
  id: string;
  coachId: string;
  name: string;
  description: string | null;
  durationWeeks: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  weeks: { id: string; weekNumber: number }[];
  assignedTo: {
    id: string;
    user: { name: string | null };
  }[];
}

// GET /api/coach/clients
export interface CoachClient {
  clientProfileId: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
  };
  activePlan: {
    id: string;
    name: string;
  } | null;
  relationshipStatus: string;
  joinedAt: string;
}

// GET /api/coach/clients/[id]
export interface ClientDetail {
  id: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
    createdAt: string;
  };
  activePlan: {
    id: string;
    name: string;
    description: string | null;
    durationWeeks: number;
  } | null;
  planStartDate: string | null;
  relationshipStatus: string;
  joinedAt: string;
  completions: {
    id: string;
    dayId: string;
    completedAt: string | null;
    completionPct: number | null;
    effortRating: string | null;
    durationSec: number | null;
    day: { name: string | null; dayNumber: number } | null;
  }[];
  checkIns: {
    id: string;
    status: string;
    effortRating: string | null;
    createdAt: string;
    completedAt: string | null;
  }[];
}

// GET /api/client/week-overview
export interface WeekOverviewDay {
  dayId: string;
  dayNumber: number;
  name: string | null;
  isRestDay: boolean;
  exerciseCount: number;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  completionPct: number | null;
  completionId: string | null;
}

export interface WeekOverview {
  plan: { id: string; name: string; durationWeeks: number };
  weekNumber: number;
  weekId: string;
  planStartDate: string;
  days: WeekOverviewDay[];
}

// GET /api/client/progress
export interface ClientProgress {
  recentCompletions: {
    id: string;
    completedAt: string | null;
    completionPct: number | null;
    exercisesDone: number | null;
    exercisesTotal: number | null;
    durationSec: number | null;
    effortRating: string | null;
    day: { name: string | null; dayNumber: number } | null;
  }[];
  stats: {
    totalWorkouts: number;
    avgCompletionPct: number;
    currentStreak: number;
    workoutsLast7Days: number;
  };
}

// GET /api/client/check-ins
export interface ClientCheckIn {
  id: string;
  status: 'PENDING' | 'CLIENT_RESPONDED' | 'COMPLETED';
  createdAt: string;
  effortRating: string | null;
  painBlockers: string | null;
  clientFeeling: string | null;
  clientRespondedAt: string | null;
  coachFeedback: string | null;
  planAdjustment: boolean | null;
  completedAt: string | null;
}

// GET /api/messages/[userId]
export interface MessageThread {
  messages: ApiMessage[];
  hasMore: boolean;
  nextCursor: string | null;
}

export interface ApiMessage {
  id: string;
  content: string;
  createdAt: string;
  readAt: string | null;
  senderId: string;
  recipientId: string;
  sender: { name: string | null };
}

// GET /api/client/workout/day/[id]
export interface WorkoutDayDetail {
  dayId: string;
  dayNumber: number;
  name: string | null;
  isRestDay: boolean;
  weekNumber: number;
  exercises: WorkoutExercise[];
  completion: WorkoutCompletionRecord | null;
}

export interface WorkoutExercise {
  workoutExerciseId: string;
  orderIndex: number;
  sets: number;
  reps: string | null;
  weight: string | null;
  restSeconds: number | null;
  coachNotes: string | null;
  exercise: {
    id: string;
    name: string;
    category: string | null;
    instructions: string | null;
  };
  setCompletions: WorkoutSetCompletion[];
  flag: WorkoutFlag | null;
}

export interface WorkoutSetCompletion {
  id: string;
  setNumber: number;
  completed: boolean;
  actualWeight: number | null;
  actualReps: number | null;
  completedAt: string | null;
}

export interface WorkoutFlag {
  id: string;
  note: string | null;
  flaggedAt: string;
}

export interface WorkoutCompletionRecord {
  id: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  completionPct: number | null;
  effortRating: string | null;
  durationSec: number | null;
}

// GET /api/check-ins/[id]
export interface CheckInDetail {
  id: string;
  status: string;
  createdAt: string;
  clientRespondedAt: string | null;
  coachRespondedAt: string | null;
  completedAt: string | null;
  effortRating: string | null;
  painBlockers: string | null;
  clientFeeling: string | null;
  coachFeedback: string | null;
  planAdjustment: boolean;
  coach: {
    user: { id: string; name: string | null };
  };
  client: {
    id: string;
    user: { id: string; name: string | null };
    completions: {
      id: string;
      completedAt: string | null;
      completionPct: number | null;
      effortRating: string | null;
      day: { name: string | null } | null;
    }[];
  };
}

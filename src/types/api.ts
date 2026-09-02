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
    durationWeeks: number;
  } | null;
  lastWorkoutAt: string | null;
  pendingCheckIn: {
    id: string;
    status: string;
    createdAt: string;
  } | null;
  /** Coach-created demo client (sample mode) */
  isSample: boolean;
  /** When the coaching relationship was created */
  joinedAt: string;
  /** Joined recently and hasn't heard from the coach yet — worth a hello */
  awaitingHello: boolean;
  /** Where the client is relative to their plan's end */
  planStatus: 'NONE' | 'ACTIVE' | 'FINAL_WEEK' | 'ENDED';
  urgency: 'NEEDS_PLAN' | 'PLAN_ENDED' | 'AT_RISK' | 'AWAITING_RESPONSE' | 'CHECKIN_DUE' | 'ON_TRACK';
  urgencyOrder: number;
}

// GET /api/invites
export interface CoachInvite {
  id: string;
  email: string | null;
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED';
  expiresAt: string;
  createdAt: string;
  /** Only present while the invite is still shareable (PENDING and unexpired) */
  inviteLink?: string;
}

// GET /api/plans
export interface PlanSummary {
  id: string;
  coachId: string;
  name: string;
  description: string | null;
  durationWeeks: number;
  workoutsPerWeek: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  weeks: { id: string; weekNumber: number }[];
  assignedTo: {
    id: string;
    user: { name: string | null; avatarUrl: string | null };
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

// GET /api/coach/clients?status=ended
export interface PastClient {
  clientProfileId: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
  };
  joinedAt: string;
  endedAt: string | null;
  endedBy: 'COACH' | 'CLIENT' | null;
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
  checkInScheduleEnabled: boolean;
  /** Auto check-in cadence in days (3, 7, 14 or 28) */
  checkInIntervalDays: number;
  /** Anchor weekday for the cadence, 0 = Sunday … 6 = Saturday (UTC); null = any day */
  checkInDayOfWeek: number | null;
  isSample: boolean;
  /** Most recent COMPLETED workout in the fetched window */
  lastWorkoutAt: string | null;
  /** Same server-computed urgency the dashboard ranks by (lib/urgency.ts) */
  urgency: DashboardClient['urgency'];
  planStatus: DashboardClient['planStatus'];
  completions: {
    id: string;
    dayId: string;
    /** COMPLETED, or IN_PROGRESS for a workout started and never finished */
    status: string;
    startedAt: string | null;
    completedAt: string | null;
    completionPct: number | null;
    exercisesDone: number | null;
    exercisesTotal: number | null;
    effortRating: string | null;
    durationSec: number | null;
    day: { name: string | null; orderIndex: number; week: { id: string } | null } | null;
    flags: {
      id: string;
      workoutExerciseId: string;
      note: string | null;
      createdAt: string;
    }[];
    /** Sets where the client overrode the prescribed weight or reps */
    sets: {
      setNumber: number;
      workoutExerciseId: string;
      actualWeight: number | null;
      actualReps: number | null;
      workoutExercise: {
        trackingType: string;
        weight: number | null;
        reps: number;
        repsMax: number | null;
        exercise: { name: string };
      };
    }[];
  }[];
  checkIns: {
    id: string;
    status: string;
    effortRating: string | null;
    clientFeeling: string | null;
    painBlockers: string | null;
    clientRespondedAt: string | null;
    coachFeedback: string | null;
    planAdjustment: boolean;
    createdAt: string;
    completedAt: string | null;
  }[];
}

// GET /api/client/week-overview
export interface WeekOverviewDay {
  dayId: string;
  orderIndex: number;
  name: string | null;
  exerciseCount: number;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  completionPct: number | null;
  exercisesDone: number | null;
  completionId: string | null;
  startedAt: string | null;
  completedAt: string | null;
  durationSec: number | null;
  effortRating: string | null;
}

export interface WeekOverview {
  plan: { id: string; name: string; durationWeeks: number };
  weekNumber: number;
  weekId: string;
  planStartDate: string;
  /** Past the plan's last week — the response clamps to the final week */
  planEnded: boolean;
  days: WeekOverviewDay[];
}

// GET /api/client/progress
export interface ClientProgressCompletion {
  id: string;
  clientId: string;
  planId: string;
  weekId: string;
  dayId: string;
  status: string;
  startedAt?: string;
  completedAt?: string;
  completionPct: number;
  exercisesDone: number;
  exercisesTotal: number;
  durationSec?: number;
  effortRating?: string;
}

export interface ClientProgress {
  recentCompletions: {
    id: string;
    completedAt: string | null;
    completionPct: number | null;
    exercisesDone: number | null;
    exercisesTotal: number | null;
    durationSec: number | null;
    effortRating: string | null;
    day: { name: string | null; orderIndex: number } | null;
  }[];
  allCompletions: ClientProgressCompletion[];
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

// GET /api/messages/unread
export interface UnreadThread {
  /** The other person's user id */
  userId: string;
  name: string | null;
  avatarUrl: string | null;
  /** Set when the sender is a client — the coach app routes by this id */
  clientProfileId: string | null;
  count: number;
  lastMessageAt: string | null;
  preview: string;
}

export interface UnreadSummary {
  total: number;
  threads: UnreadThread[];
}

export interface ApiMessage {
  id: string;
  content: string;
  createdAt: string;
  readAt: string | null;
  senderId: string;
  recipientId: string;
  sender: { name: string | null };
  /**
   * Present when the message was sent about a flagged exercise. Sets and the
   * flag note are scoped to the message's own workout, so the counts describe
   * that session rather than the exercise's whole history.
   */
  exerciseContext: {
    exerciseId: string;
    exerciseName: string;
    prescription: string;
    setsCompleted: number;
    totalSets: number;
    flagNote: string | null;
  } | null;
}

// GET /api/client/workout/day/[id]
export interface WorkoutDayDetail {
  dayId: string;
  orderIndex: number;
  name: string | null;
  description: string | null;
  weekNumber: number;
  exercises: WorkoutExercise[];
  completion: WorkoutCompletionRecord | null;
}

export interface WorkoutExercise {
  workoutExerciseId: string;
  orderIndex: number;
  /** When TIME, `reps` is a formatted duration ("60s") and actualReps are seconds. */
  trackingType: 'REPS' | 'TIME';
  sets: number;
  reps: string | null;
  /** Prescribed weight as stored (Prisma Float) — the unit is whatever the
   *  coach programs in; there is no weightUnit column yet. */
  weight: number | null;
  restSeconds: number | null;
  coachNotes: string | null;
  /** Chained to the exercise above it (by orderIndex) into a superset. */
  supersetWithPrevious: boolean;
  exercise: {
    id: string;
    name: string;
    category: string | null;
    instructions: string | null;
  };
  setCompletions: WorkoutSetCompletion[];
  flag: WorkoutFlag | null;
  /** Heaviest logged set from the most recent completed session of this exercise. */
  lastPerformance: LastPerformance | null;
}

/** The "last time you hit X" reference: top set of the prior session. */
export interface LastPerformance {
  weight: number | null;
  reps: number | null;
  performedAt: string;
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

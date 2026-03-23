import type {
  Client,
  CheckIn,
  WorkoutPlan,
  WorkoutWeek,
  WorkoutDay,
  Exercise,
  WorkoutCompletion,
  Message,
} from '@/types';
import type {
  ClientDetail,
  ClientCheckIn,
  ClientProgressCompletion,
  ApiMessage,
} from '@/types/api';
import type { PlanDetail } from '@/hooks/api/usePlanDetail';

// ---------------------------------------------------------------------------
// Plan adapters
// ---------------------------------------------------------------------------

/** Convert a PlanDetail (API / hook response) → domain WorkoutPlan. */
export function apiPlanToWorkoutPlan(plan: PlanDetail): WorkoutPlan {
  return {
    id: plan.id,
    name: plan.name,
    description: plan.description ?? undefined,
    emoji: plan.emoji,
    durationWeeks: plan.durationWeeks,
    workoutsPerWeek: plan.workoutsPerWeek,
    weeks: plan.weeks.map(
      (w): WorkoutWeek => ({
        id: w.id,
        weekNumber: w.weekNumber,
        days: w.days.map(
          (d): WorkoutDay => ({
            id: d.id,
            orderIndex: d.orderIndex,
            name: d.name ?? `Day ${d.orderIndex}`,
            description: d.description ?? undefined,
            exercises: d.exercises.map(
              (e): Exercise => ({
                id: e.id,
                name: e.exercise.name,
                category: e.exercise.category ?? undefined,
                sets: e.sets,
                reps: e.reps ?? undefined,
                weight: e.weight ?? undefined,
                notes: e.coachNotes ?? undefined,
              }),
            ),
          }),
        ),
      }),
    ),
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
  };
}

// ---------------------------------------------------------------------------
// Check-in adapters
// ---------------------------------------------------------------------------

type RawCheckIn = {
  id: string;
  status: string;
  createdAt: string;
  effortRating: string | null;
  painBlockers?: string | null;
  clientFeeling?: string | null;
  clientRespondedAt?: string | null;
  coachFeedback?: string | null;
  planAdjustment?: boolean | null;
  completedAt: string | null;
};

/** Convert an API check-in (from client or coach endpoints) → domain CheckIn. */
export function apiCheckInToCheckIn(
  ci: RawCheckIn,
  clientProfileId: string,
  coachUserId: string,
): CheckIn {
  return {
    id: ci.id,
    clientId: clientProfileId,
    coachId: coachUserId,
    date: ci.createdAt,
    status:
      ci.status === 'PENDING'
        ? 'pending'
        : ci.status === 'CLIENT_RESPONDED'
          ? 'responded'
          : 'completed',
    workoutFeeling: (ci.effortRating as CheckIn['workoutFeeling']) ?? undefined,
    bodyFeeling: (ci.clientFeeling as CheckIn['bodyFeeling']) ?? undefined,
    clientNotes: ci.painBlockers ?? undefined,
    clientRespondedAt: ci.clientRespondedAt ?? undefined,
    coachResponse: ci.coachFeedback ?? undefined,
    planAdjustment: ci.planAdjustment || undefined,
    completedAt: ci.completedAt ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// Message adapters
// ---------------------------------------------------------------------------

/** Convert API messages → domain Messages (reverses to oldest-first). */
export function apiMessagesToMessages(
  msgs: ApiMessage[],
  clientProfileId: string,
): Message[] {
  return msgs
    .map((m) => ({
      id: m.id,
      senderId: m.senderId,
      senderName: m.sender.name ?? 'Unknown',
      content: m.content,
      timestamp: m.createdAt,
      read: m.readAt !== null,
      clientId: clientProfileId,
    }))
    .reverse();
}

// ---------------------------------------------------------------------------
// Workout completion adapters
// ---------------------------------------------------------------------------

/** Convert progress API completions → domain WorkoutCompletion[]. */
export function apiProgressToWorkoutCompletions(
  completions: ClientProgressCompletion[],
): WorkoutCompletion[] {
  return completions.map((c) => ({
    id: c.id,
    clientId: c.clientId,
    planId: c.planId,
    weekId: c.weekId,
    dayId: c.dayId,
    status: c.status as WorkoutCompletion['status'],
    startedAt: c.startedAt,
    completedAt: c.completedAt,
    completionPct: c.completionPct,
    exercisesDone: c.exercisesDone,
    exercisesTotal: c.exercisesTotal,
    durationSec: c.durationSec,
    effortRating: c.effortRating as WorkoutCompletion['effortRating'],
  }));
}

/** Convert coach client-detail completions → domain WorkoutCompletion[]. */
export function apiClientDetailToWorkoutCompletions(
  completions: ClientDetail['completions'],
  clientProfileId: string,
  planId: string,
): WorkoutCompletion[] {
  return completions.map((c) => ({
    id: c.id,
    clientId: clientProfileId,
    planId,
    weekId: c.day?.week?.id ?? '',
    dayId: c.dayId,
    status: 'COMPLETED' as const,
    completedAt: c.completedAt ?? undefined,
    completionPct: c.completionPct ?? 0,
    exercisesDone: c.exercisesDone ?? 0,
    exercisesTotal: c.exercisesTotal ?? 0,
    durationSec: c.durationSec ?? undefined,
    effortRating: (c.effortRating as WorkoutCompletion['effortRating']) ?? undefined,
  }));
}

// ---------------------------------------------------------------------------
// Client adapter (coach viewing a client)
// ---------------------------------------------------------------------------

/** Convert ClientDetail (coach endpoint) → domain Client. */
export function apiClientDetailToClient(detail: ClientDetail): Client {
  return {
    id: detail.id,
    name: detail.user.name ?? 'Unknown',
    email: detail.user.email,
    currentPlanId: detail.activePlan?.id,
    status: detail.relationshipStatus === 'ACTIVE' ? 'active' : 'inactive',
    planStartDate: detail.planStartDate ?? undefined,
    lastCheckInDate: detail.checkIns[0]?.completedAt ?? undefined,
  };
}

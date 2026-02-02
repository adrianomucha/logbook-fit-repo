import { Client, WorkoutPlan, CompletedWorkout, Message } from '@/types';
import { startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';

export interface WeeklyActivity {
  completed: number;
  scheduled: number;
  lastWorkout: CompletedWorkout | null;
}

export function getWeeklyActivity(
  client: Client,
  plan: WorkoutPlan | undefined,
  completedWorkouts: CompletedWorkout[]
): WeeklyActivity {
  if (!plan) {
    return { completed: 0, scheduled: 0, lastWorkout: null };
  }

  const weekStart = startOfWeek(new Date());
  const weekEnd = endOfWeek(new Date());

  const thisWeekWorkouts = completedWorkouts
    .filter(w =>
      w.clientId === client.id &&
      isWithinInterval(new Date(w.completedAt), { start: weekStart, end: weekEnd })
    )
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());

  return {
    completed: thisWeekWorkouts.length,
    scheduled: plan.workoutsPerWeek || 0,
    lastWorkout: thisWeekWorkouts[0] || null
  };
}

export interface CoachInteractions {
  lastMessage: Message | null;
  lastPlanEdit: Date | null;
}

export function getCoachInteractions(
  client: Client,
  plan: WorkoutPlan | undefined,
  messages: Message[],
  currentUserId: string
): CoachInteractions {
  // Find last message sent BY coach TO client
  const coachMessages = messages
    .filter(m => m.senderId === currentUserId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return {
    lastMessage: coachMessages[0] || null,
    lastPlanEdit: plan ? new Date(plan.updatedAt) : null
  };
}

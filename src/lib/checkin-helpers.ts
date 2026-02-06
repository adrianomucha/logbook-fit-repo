import { CheckIn, Client, CompletedWorkout, WorkoutFeeling, BodyFeeling } from '@/types';
import { format, addDays } from 'date-fns';

/**
 * Create a new check-in (coach initiates, status = pending)
 */
export function createCheckIn(clientId: string, coachId: string): CheckIn {
  return {
    id: `checkin-${Date.now()}`,
    clientId,
    coachId,
    date: new Date().toISOString(),
    status: 'pending',
  };
}

/**
 * Submit client response (status: pending → responded)
 */
export function submitClientResponse(
  checkIn: CheckIn,
  response: {
    workoutFeeling: WorkoutFeeling;
    bodyFeeling: BodyFeeling;
    clientNotes?: string;
    flaggedWorkoutId?: string;
    flaggedWorkoutNote?: string;
  }
): CheckIn {
  return {
    ...checkIn,
    ...response,
    status: 'responded',
    clientRespondedAt: new Date().toISOString(),
  };
}

/**
 * Complete check-in with coach response (status: responded → completed)
 */
export function completeCheckIn(
  checkIn: CheckIn,
  response: {
    coachResponse: string;
    planAdjustment?: boolean;
  }
): CheckIn {
  return {
    ...checkIn,
    ...response,
    status: 'completed',
    completedAt: new Date().toISOString(),
  };
}

/**
 * Get completed workouts from the last N days for a client
 */
export function getRecentWorkouts(
  clientId: string,
  completedWorkouts: CompletedWorkout[],
  days: number = 7
): CompletedWorkout[] {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return completedWorkouts
    .filter(w => w.clientId === clientId && new Date(w.completedAt).getTime() >= cutoff)
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
}

/**
 * Find a pending check-in for a client (awaiting client response)
 */
export function getPendingCheckInForClient(
  clientId: string,
  checkIns: CheckIn[]
): CheckIn | undefined {
  return checkIns.find(c => c.clientId === clientId && c.status === 'pending');
}

/**
 * Find an active check-in for a client (pending or responded, not yet completed)
 */
export function getActiveCheckIn(
  clientId: string,
  checkIns: CheckIn[]
): CheckIn | undefined {
  return checkIns
    .filter(c => c.clientId === clientId && (c.status === 'pending' || c.status === 'responded'))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
}

/**
 * Check if a check-in is awaiting coach response (client has submitted)
 */
export function isAwaitingCoachResponse(checkIn: CheckIn): boolean {
  return checkIn.status === 'responded';
}

/**
 * Calculate next check-in date based on 7-day cadence
 */
export function calculateNextCheckIn(client: Client): string | undefined {
  if (!client.lastCheckInDate) return undefined;

  const lastCheckIn = new Date(client.lastCheckInDate);
  const nextCheckIn = addDays(lastCheckIn, 7);

  return format(nextCheckIn, 'MMM d');
}

import { CheckIn, WorkoutFeeling, BodyFeeling } from '@/types';

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

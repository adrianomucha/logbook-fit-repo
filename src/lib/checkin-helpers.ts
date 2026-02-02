import { CheckIn, Client } from '@/types';
import { format, addDays } from 'date-fns';

/**
 * Workaround for missing clientResponse/coachResponse fields
 *
 * Current approach:
 * - status='pending' = client submitted, coach hasn't responded
 * - status='completed' = coach has responded
 *
 * Technical debt: Proper solution requires CheckIn schema migration
 * to add clientResponseAt and coachResponseAt timestamp fields
 */
export function isAwaitingCoachResponse(checkIn: CheckIn): boolean {
  return checkIn.status === 'pending';
}

/**
 * Calculate next check-in date based on last check-in
 * Assumes 7-day cadence (future: make configurable per client)
 */
export function calculateNextCheckIn(client: Client): string | undefined {
  if (!client.lastCheckInDate) return undefined;

  const lastCheckIn = new Date(client.lastCheckInDate);
  const nextCheckIn = addDays(lastCheckIn, 7);

  return format(nextCheckIn, 'MMM d');
}

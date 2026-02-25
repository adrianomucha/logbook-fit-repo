import { CheckInSchedule, CheckInScheduleStatus, CheckIn, Client } from '@/types';

/**
 * Create a new CheckInSchedule for a coach–client pair.
 */
export function createCheckInSchedule(
  clientId: string,
  coachId: string,
  anchorDate: string
): CheckInSchedule {
  const now = new Date().toISOString();
  return {
    id: `schedule-${clientId}-${Date.now()}`,
    coachId,
    clientId,
    status: 'ACTIVE',
    cadence: 'WEEKLY',
    anchorDate,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Find the schedule for a given client. One schedule per coach–client pair.
 */
export function getScheduleForClient(
  clientId: string,
  schedules: CheckInSchedule[]
): CheckInSchedule | undefined {
  return schedules.find((s) => s.clientId === clientId);
}

/**
 * Upsert a CheckInSchedule: update if exists, create if not.
 * Returns the full updated schedules array.
 */
export function upsertSchedule(
  schedules: CheckInSchedule[],
  clientId: string,
  coachId: string,
  status: CheckInScheduleStatus,
  anchorDate: string
): CheckInSchedule[] {
  const existing = schedules.find((s) => s.clientId === clientId);
  const now = new Date().toISOString();

  if (existing) {
    return schedules.map((s) =>
      s.clientId === clientId
        ? { ...s, status, anchorDate, coachId, updatedAt: now }
        : s
    );
  }

  return [...schedules, createCheckInSchedule(clientId, coachId, anchorDate)];
}

/**
 * Determine if a check-in is due for a given schedule.
 *
 * A check-in is due when:
 * 1. Schedule is ACTIVE
 * 2. No pending or responded check-in already exists for the client
 * 3. 7+ days have elapsed since max(anchorDate, lastCheckInDate)
 *
 * Idempotent — returns false if a check-in already exists.
 */
export function isCheckInDue(
  schedule: CheckInSchedule,
  client: Client,
  checkIns: CheckIn[]
): boolean {
  if (schedule.status !== 'ACTIVE') return false;

  // Don't create if there's already a pending or responded check-in
  const hasActiveCheckIn = checkIns.some(
    (c) =>
      c.clientId === schedule.clientId &&
      (c.status === 'pending' || c.status === 'responded')
  );
  if (hasActiveCheckIn) return false;

  // Reference date = later of anchorDate and lastCheckInDate
  const anchorMs = new Date(schedule.anchorDate).getTime();
  const lastCheckInMs = client.lastCheckInDate
    ? new Date(client.lastCheckInDate).getTime()
    : 0;
  const referenceMs = Math.max(anchorMs, lastCheckInMs);

  const daysSinceReference = Math.floor(
    (Date.now() - referenceMs) / (1000 * 60 * 60 * 24)
  );

  return daysSinceReference >= 7;
}

/**
 * Process all schedules and return new CheckIn objects for any that are due.
 * Called on app load as the "frontend cron" simulation.
 */
export function detectDueCheckIns(
  schedules: CheckInSchedule[],
  clients: Client[],
  checkIns: CheckIn[]
): CheckIn[] {
  const newCheckIns: CheckIn[] = [];

  for (const schedule of schedules) {
    if (schedule.status !== 'ACTIVE') continue;

    const client = clients.find((c) => c.id === schedule.clientId);
    if (!client) continue;

    if (isCheckInDue(schedule, client, checkIns)) {
      newCheckIns.push({
        id: `checkin-auto-${schedule.clientId}-${Date.now()}`,
        clientId: schedule.clientId,
        coachId: schedule.coachId,
        date: new Date().toISOString(),
        status: 'pending',
      });
    }
  }

  return newCheckIns;
}

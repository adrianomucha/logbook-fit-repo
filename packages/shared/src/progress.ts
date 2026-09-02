import { endOfWeek, getDay, isWithinInterval, parseISO, startOfWeek } from 'date-fns';
import type { WorkoutCompletion, WorkoutDay } from './types';

/**
 * The Progress tab's pure logic, shared by web and app: the one-sentence
 * verdict that connects this week's numbers to how the client is doing,
 * and the display helpers for the workout log.
 */

export type VerdictTone = 'success' | 'warning' | 'neutral';

export interface WeekVerdict {
  completed: number;
  target: number;
  text: string;
  tone: VerdictTone;
}

/** This week's completed sessions against the target, with coaching-flavoured encouragement. */
export function getWeekVerdict(completions: WorkoutCompletion[], targetPerWeek: number, now = new Date()): WeekVerdict {
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const thisWeekCompleted = completions.filter((c) => {
    if (!c.completedAt || c.status !== 'COMPLETED') return false;
    return isWithinInterval(parseISO(c.completedAt), { start: weekStart, end: weekEnd });
  }).length;

  const totalCompleted = completions.filter((c) => c.status === 'COMPLETED').length;
  const base = { completed: thisWeekCompleted, target: targetPerWeek };

  if (totalCompleted === 0) {
    return { ...base, text: 'Your first workout will kick things off.', tone: 'neutral' };
  }
  if (thisWeekCompleted >= targetPerWeek) {
    return { ...base, text: 'Target hit. Consistency is building.', tone: 'success' };
  }

  const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay();
  const expectedByNow = Math.ceil((dayOfWeek / 7) * targetPerWeek);
  if (thisWeekCompleted >= expectedByNow) {
    const remaining = targetPerWeek - thisWeekCompleted;
    return { ...base, text: remaining === 1 ? 'On pace, one more to go.' : `On pace, ${remaining} more to go.`, tone: 'success' };
  }
  if (thisWeekCompleted > 0) {
    const remaining = targetPerWeek - thisWeekCompleted;
    return { ...base, text: remaining === 1 ? 'Almost there, one more session.' : `${remaining} sessions to go.`, tone: 'warning' };
  }
  if (dayOfWeek <= 2) {
    return { ...base, text: "Week's just getting started.", tone: 'neutral' };
  }
  return { ...base, text: 'Still time to get sessions in.', tone: 'warning' };
}

/**
 * A user-friendly workout name with a fallback chain: the day's name, then
 * "Day N", then a date-based label.
 */
export function getWorkoutDisplayName(day: WorkoutDay | undefined, dayIndex: number, completedAt: string | undefined): string {
  if (day?.name) return day.name;
  if (dayIndex >= 0) return `Day ${dayIndex + 1}`;
  if (completedAt) {
    const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return `${names[getDay(parseISO(completedAt))]} Workout`;
  }
  return 'Workout';
}

/** "45m" / "1h 5m" / "—" */
export function formatHistoryDuration(seconds?: number): string {
  if (!seconds) return '—';
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

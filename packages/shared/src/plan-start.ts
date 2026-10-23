import { format, parseISO } from 'date-fns';
import { calendarDayInstant, dateKeyToDayNumber, dayNumberToDateKey, localDayNumber, mondayOf } from './timezone';

/**
 * When a newly assigned plan begins. Plan weeks run Monday to Sunday on the
 * client's calendar, so the coach chooses between starting now (week 1 is
 * whatever is left of this week) and starting clean next Monday. Nobody
 * guesses on their behalf: the coach knows whether the client can still get
 * this week's sessions in.
 */
export type PlanStartChoice = 'today' | 'monday';

/** The coming Monday on the client's calendar, as a day number. Never today. */
function nextMonday(timeZone: string | null | undefined, now: Date): number {
  return mondayOf(localDayNumber(now, timeZone)) + 7;
}

/**
 * What the start choice preselects: today while most of the week is still
 * ahead (Monday to Wednesday), next Monday from Thursday on.
 */
export function defaultPlanStart(timeZone: string | null | undefined, now: Date = new Date()): PlanStartChoice {
  const today = localDayNumber(now, timeZone);
  return today - mondayOf(today) <= 2 ? 'today' : 'monday';
}

/**
 * The planStartDate to store: today or next Monday as calendar dates on the
 * client's calendar, saved with calendarDayInstant so the plan's weeks stay
 * put in whatever timezone the client is in: a traveller, or a client whose
 * app hasn't synced their timezone yet when the coach assigns.
 */
export function planStartDateFor(
  choice: PlanStartChoice,
  timeZone: string | null | undefined,
  now: Date = new Date()
): Date {
  return calendarDayInstant(choice === 'today' ? localDayNumber(now, timeZone) : nextMonday(timeZone, now));
}

export interface PlanStartOption {
  value: PlanStartChoice;
  label: string;
  detail: string;
}

/** The two choices as the coach sees them, worded for the client's current day. */
export function planStartOptions(timeZone: string | null | undefined, now: Date = new Date()): PlanStartOption[] {
  const today = localDayNumber(now, timeZone);
  const daysLeft = mondayOf(today) + 7 - today;
  const monday = nextMonday(timeZone, now);
  return [
    {
      value: 'today',
      label: 'Today',
      detail:
        daysLeft === 7
          ? 'A full first week, starting now.'
          : daysLeft === 1
            ? 'Week 1 is just today. Week 2 starts tomorrow.'
            : `Week 1 is the ${daysLeft} days left in this week.`,
    },
    {
      value: 'monday',
      label: format(parseISO(dayNumberToDateKey(monday)), 'EEEE, MMM d'),
      detail: 'A full first week. They can look through it until then.',
    },
  ];
}

/** The client's Today tab before their plan begins. */
export const PLAN_STARTS_COPY = {
  eyebrow: 'Coming up',
  title: (startsOn: string, now: Date = new Date()) => {
    const days = dateKeyToDayNumber(startsOn) - dateKeyToDayNumber(format(now, 'yyyy-MM-dd'));
    if (days <= 1) return 'Your plan starts tomorrow';
    return `Your plan starts ${format(parseISO(startsOn), days < 7 ? 'EEEE' : 'EEEE, MMM d')}`;
  },
  body: (coachName: string | null | undefined, workouts: number) => {
    const coach = coachName?.split(' ')[0] || 'Your coach';
    const week = workouts > 0 ? `Week 1 has ${workouts} ${workouts === 1 ? 'workout' : 'workouts'}. ` : '';
    return `${coach} has it ready. ${week}Take a look through it before then.`;
  },
  action: 'Preview week 1',
} as const;

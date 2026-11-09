import type { StateArtId } from './state-art';

/**
 * The client's empty states, worded once for web and app. Each one says only
 * what's true: an invite link accepts into an existing account (signed in,
 * via /signup?invite=…), so the no-coach state can point at one.
 *
 * Headlines come in two parts, rendered as two lines: `title` (what's true,
 * in ink) and `tail` (what happens next, in grey). `art` names the
 * illustration from @logbook/shared/state-art.
 */
const coachFirst = (coachName: string | null | undefined) => coachName?.split(' ')[0] || 'Your coach';

export const NO_COACH_COPY = {
  art: 'noCoach' satisfies StateArtId,
  title: 'No coach connected.',
  tail: 'Your workout history is still saved.',
  body: 'Open an invite link and sign in to accept.',
} as const;

/** The plan's current week has no workouts in it (or no week matches yet). */
export const EMPTY_WEEK_COPY = {
  art: 'week' satisfies StateArtId,
  title: 'Nothing scheduled this week.',
  tail: 'Rest is part of the plan.',
  body: (coachName: string | null | undefined) =>
    `Expecting one? Message ${coachName?.split(' ')[0] || 'your coach'}.`,
} as const;

/** Signed up, no plan yet: the welcome on the Workout tab */
export const WELCOME_COPY = {
  eyebrow: 'Getting started',
  title: (clientFirstName: string) => `You're in, ${clientFirstName}`,
  body: (coachName: string) => `${coachName} is putting your training plan together.`,
  steps: (coachName: string) =>
    [
      { label: 'Create your account', detail: 'Done, welcome aboard', mark: 'done' },
      { label: `${coachName} builds your plan`, detail: 'Usually ready within a day or two', mark: 'started' },
      { label: 'Start training', detail: 'Your workouts will appear right here', mark: 'upcoming' },
    ] as const,
  sayHiTitle: 'Break the ice while you wait',
  sayHiBody: (coachName: string) => `Tell ${coachName} about your goals, schedule, or any injuries. It all helps shape your plan.`,
  sayHiCta: (coachFirstName: string) => `Say hi to ${coachFirstName}`,
  leave: 'Leave this coach',
} as const;

/** The plan exists but this week hasn't been built yet (Today and Week views) */
export const WEEK_NOT_BUILT_COPY = {
  art: 'building' satisfies StateArtId,
  title: "This week isn't set up yet.",
  tail: (coachName: string | null | undefined) => `${coachFirst(coachName)} is still building it.`,
  message: (coachName: string | null | undefined) => `Message ${coachName?.split(' ')[0] || 'coach'}`,
} as const;

/** The plan or week couldn't be loaded */
export const LOAD_ERROR_COPY = {
  art: 'unplugged' satisfies StateArtId,
  title: "Couldn't load your plan.",
  tail: 'Check your connection and try again.',
  retry: 'Try again',
} as const;

/** The Progress tab before there's a plan to make progress on */
export const PROGRESS_BEFORE_PLAN_COPY = {
  art: 'plates' satisfies StateArtId,
  title: 'Your progress starts here.',
  tail: 'Every workout adds to the stack.',
} as const;

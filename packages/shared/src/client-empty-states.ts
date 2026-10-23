/**
 * The client's empty states, worded once for web and app. Each one says only
 * what's true: an invite link accepts into an existing account (signed in,
 * via /signup?invite=…), so the no-coach state can point at one.
 */
export const NO_COACH_COPY = {
  title: "You're not connected to a coach",
  body: 'Your workout history is saved on your account. Got an invite link from a coach? Open it and sign in to accept.',
} as const;

/** The plan's current week has no workouts in it (or no week matches yet). */
export const EMPTY_WEEK_COPY = {
  title: 'Nothing scheduled this week',
  body: (coachName: string | null | undefined) =>
    `${coachName?.split(' ')[0] || 'Your coach'} hasn't added workouts for this week yet. Message them if you were expecting one.`,
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

/** The plan exists but this week hasn't been built yet */
export const WEEK_NOT_BUILT_COPY = {
  title: "This week isn't set up yet",
  body: (coachName: string | null | undefined) =>
    `${coachName?.split(' ')[0] || 'Your coach'} hasn't built this week of your plan yet. Send them a message.`,
} as const;

/** The plan or week couldn't be loaded */
export const LOAD_ERROR_COPY = {
  title: "Couldn't load your plan",
  body: 'Check your connection and try again.',
  retry: 'Try again',
} as const;

/** The Progress tab before there's a plan to make progress on */
export const PROGRESS_BEFORE_PLAN_COPY = {
  title: 'Your progress starts here',
  body: 'Once your plan arrives and you log your first workout, your wins show up here.',
} as const;

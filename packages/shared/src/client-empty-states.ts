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

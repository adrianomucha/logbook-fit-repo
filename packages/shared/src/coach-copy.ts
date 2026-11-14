/**
 * Coach-facing wording used on more than one screen, so the roster, the
 * client profile and the check-in pages name the same thing the same way.
 */

/** A check-in's state, as the coach reads it */
export const CHECKIN_STATUS = {
  /** Sent, no reply yet: a chip or a short value */
  waiting: 'Waiting on reply',
  /** Sent, no reply yet: a heading */
  waitingOn: (clientFirstName: string) => `Waiting on ${clientFirstName}`,
  /** The client replied; the coach's move */
  ready: 'Ready to review',
  /** "Sent 2 days ago" */
  sent: (ago: string) => `Sent ${ago}`,
  /** "Replied 3 hours ago" */
  replied: (ago: string) => `Replied ${ago}`,
} as const;

/** Check-in actions */
export const CHECKIN_ACTION = {
  send: 'Send check-in',
  review: 'Review check-in',
  complete: 'Complete check-in',
} as const;

/** Making a plan: one name for the action wherever it appears */
export const CREATE_PLAN = 'Create a plan';

export const INVITE_CLIENT = 'Invite client';

/**
 * Plan builder saves that failed. Each one says what was not saved, because
 * the editor keeps the coach's typing on screen and it would otherwise look
 * like it went through.
 */
export const PLAN_SAVE_ERROR = {
  addExercise: "That exercise wasn't added. Check your connection and try again.",
  updateExercise: "Your changes to that exercise weren't saved. Check your connection and try again.",
  removeExercise: "That exercise wasn't removed. Check your connection and try again.",
  planName: "The plan name wasn't saved, so it's back to what it was.",
  dayName: "The day name wasn't saved, so it's back to what it was.",
  dayDescription: "The day notes weren't saved, so they're back to what they were.",
} as const;

/** A plan with no exercises in it: nothing for a client to train on yet. */
export const EMPTY_PLAN = {
  /** Tag on the plan's row in a list */
  tag: 'No exercises yet',
  /** Why it can't be picked, under a list that has one */
  hint: 'A plan needs at least one exercise before you can assign it. Add some on the Plans page.',
  /** The server's refusal */
  error: 'This plan has no exercises yet. Add at least one before assigning it.',
} as const;

/** A past client's read-only record, opened from the Past clients list. */
export const PAST_CLIENT = {
  eyebrow: 'Past client',
  readOnly: 'Read only',
  /** "Left Mar 3, 2026" when the client ended it, "Ended ..." when the coach did */
  ended: (leftThemselves: boolean, date: string | null) =>
    `${leftThemselves ? 'Left' : 'Ended'}${date ? ` ${date}` : ''}`,
  workouts: 'Workouts',
  noWorkouts: 'No finished workouts on your plans.',
  checkIns: 'Check-ins',
  noCheckIns: 'No check-ins were answered.',
  conversation: 'Conversation',
  noMessages: 'No messages were sent.',
  notFound: "This past client's record isn't available.",
  /** List row hint for a client who ended it themselves */
  canRejoin: 'can rejoin with a new invite',
} as const;

/** The plan builder's exercise picker: the coach's own exercises, then starters. */
export const EXERCISE_LIBRARY = {
  /** Tag on an exercise the coach has used or created */
  yours: 'Yours',
  remove: (name: string) => `Remove ${name} from your library`,
  confirmRemove: 'Tap again to remove',
  removed: (name: string) => `${name} removed from your library. Plans that use it keep it.`,
  removeFailed: "That exercise wasn't removed. Check your connection and try again.",
} as const;

/** Taking a client's plan away, said before the second tap that does it. */
export const REMOVE_PLAN = {
  action: 'Remove plan',
  confirm: 'Tap again to remove',
  /** What is lost, and what is not */
  warning: (clientFirstName: string | undefined, planName: string) =>
    `${clientFirstName ?? 'Your client'} loses their place in ${planName}. Assigning it again starts from week 1. Past workouts stay in their history.`,
  done: (clientFirstName: string | undefined) => `${clientFirstName ?? 'Your client'} has no plan now.`,
} as const;

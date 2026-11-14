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

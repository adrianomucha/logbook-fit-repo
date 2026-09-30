/**
 * Leaving a coach, worded once for web and app. It lives in Settings →
 * Account rather than on the Progress tab: ending the relationship doesn't
 * belong under the client's training history.
 */
export const LEAVE_COACH_COPY = {
  sectionLabel: 'Coaching',
  coachedBy: (coachName: string | null | undefined) => `Coached by ${coachName ?? 'your coach'}`,
  hint: 'Leaving removes your plan and closes messaging. Your workout history stays.',
  action: 'Leave coach…',
  title: 'Leave your coach?',
  message: (coachName: string | null | undefined) => `You'll stop training with ${coachName ?? 'your coach'}.`,
  warning: 'Your assigned plan is removed and messaging closes for both of you. Your workout history stays on your account.',
  confirm: 'Leave coach',
  done: 'You’ve left your coach',
  failedTitle: "Couldn't leave your coach",
  failed: 'Please try again.',
} as const;

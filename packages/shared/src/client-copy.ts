/**
 * Client-facing wording used on more than one screen, so the web and the
 * app (and different screens of each) say the same thing the same way.
 */

/** "Target hit: 4 of 4 workouts" · "3 of 4 workouts done" */
export function formatWeekTally(completed: number, target: number): string {
  return completed >= target ? `Target hit: ${completed} of ${target} workouts` : `${completed} of ${target} workouts done`;
}

/** Under a check-in the coach hasn't answered yet */
export const COACH_REPLY_PENDING = 'Your coach will reply soon.';

export type EffortRating = 'EASY' | 'MEDIUM' | 'HARD';

/** "How did that feel?" after a workout: the same three answers wherever it's asked */
export const EFFORT_CHOICES: { value: EffortRating; label: string }[] = [
  { value: 'EASY', label: 'Easy' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HARD', label: 'Hard' },
];

/** The client's home: the Workout tab (Today and This week) */
export const HOME_TAB = 'Workout';
export const BACK_HOME = `Back to ${HOME_TAB}`;

/** Check-in states, the same on web and in the app */
export const CHECKIN_ALREADY_SENT = 'You already sent this one to your coach.';
export const CHECKIN_EXPIRED = `This check-in is no longer open. The next one will appear on your ${HOME_TAB} tab.`;
export function checkInReplyNote(coachFirstName: string | null | undefined): string {
  return `${coachFirstName ?? 'Your coach'} will read it and get back to you. Their reply shows up on your ${HOME_TAB} tab.`;
}

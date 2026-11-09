/**
 * Wording for a workout the idle sweep finished on the client's behalf
 * (lib/idle-workouts.ts on the server): they logged sets, then never tapped
 * Finish. Shared so the web, the app and the coach all say the same thing.
 */
export const AUTO_FINISHED_COPY = {
  /** The tag on the workout wherever it's listed */
  label: 'Auto-finished',
  /** To the client, where there's room for a sentence */
  client: 'You left this workout open, so it was saved as of your last logged set.',
  /** To the coach, beside the tag */
  coach: 'They never tapped Finish. Saved as of their last logged set.',
} as const;

/** The finished-session card's eyebrow: "Workout complete · Day 2", or "Auto-finished · Day 2" */
export function sessionCompleteEyebrow(day: string | undefined, autoFinished: boolean | undefined): string {
  const lead = autoFinished ? AUTO_FINISHED_COPY.label : 'Workout complete';
  return day ? `${lead} · Day ${day}` : lead;
}

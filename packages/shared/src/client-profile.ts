/**
 * Wording for the coach's view of one client, shared so the web and native
 * apps greet a new client the same way.
 */

/** Tappable first messages for an empty thread — a hello, then the two
 *  things a coach needs to know before writing the first plan. */
export function coachOpeners(firstName: string): string[] {
  return [
    `Welcome aboard, ${firstName}! 👋`,
    'What are you training for?',
    'Any injuries I should know about?',
  ];
}

export const FIRST_PLAN_COPY = {
  title: (firstName: string) => `Pick ${firstName}’s first plan`,
  // Assigning starts the plan the same day
  subtitle: 'It starts today, on week 1.',
  noPlans: 'You haven’t built any plans yet.',
  build: 'Build a new plan',
  buildHint: (firstName: string) => `From scratch, made for ${firstName}`,
  showAll: (count: number) => `See all ${count} plans`,
  showAllHint: 'Search your whole library',
} as const;

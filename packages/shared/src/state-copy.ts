import type { StateArtId } from './state-art';

/**
 * Wording and illustration for the empty, error and not-found states that
 * aren't on the client's Today and Progress tabs (those live in
 * client-empty-states.ts). Same two-part headline: `title` is what's true,
 * `tail` is the grey second line saying what happens next.
 */

const firstName = (name: string | null | undefined, fallback: string) => name?.split(' ')[0] || fallback;

// ── Shared by both apps ─────────────────────────────────────────────────────

/** A workout page that failed to load, or points at a day not in the plan */
export const WORKOUT_LOAD_ERROR_COPY = {
  art: 'unplugged' satisfies StateArtId,
  title: "Couldn't load this workout.",
  tail: 'Check your connection and try again.',
  back: 'Go back',
} as const;

export const WORKOUT_NOT_FOUND_COPY = {
  art: 'lost' satisfies StateArtId,
  title: 'Workout not found.',
  tail: "It isn't part of your plan.",
  back: 'Go back',
} as const;

/** A link into the app that leads nowhere */
export const PAGE_NOT_FOUND_COPY = {
  art: 'lost' satisfies StateArtId,
  kicker: '404',
  title: 'Page not found.',
  tail: 'This link leads nowhere.',
  home: 'Go home',
} as const;

/** An unexpected crash caught by an error boundary */
export const CRASH_COPY = {
  art: 'unplugged' satisfies StateArtId,
  title: 'Something went wrong.',
  tail: "It's been reported.",
  reference: (digest: string) => `Reference: ${digest}`,
  retry: 'Try again',
} as const;

/** The progress log has no weeks yet */
export const LOG_EMPTY_ART: StateArtId = 'logbook';

// ── Coach workspace (web) ───────────────────────────────────────────────────

export const NO_PLANS_COPY = {
  art: 'plans' satisfies StateArtId,
  kicker: 'Plan library · 0 plans',
  title: 'No plans yet.',
  tail: 'Build your first one.',
  body: 'Design a plan once, then assign it to any client. One plan, many athletes.',
} as const;

/** The plan picker in Assign Plan when the library is empty */
export const NO_TEMPLATES_COPY = {
  art: 'plans' satisfies StateArtId,
  title: 'No plans yet.',
  tail: 'Create one, then assign it here.',
} as const;

/** Load failures across the coach workspace, signal-lost amber */
export const ROSTER_LOAD_ERROR_COPY = {
  art: 'unplugged' satisfies StateArtId,
  kicker: 'Roster · Signal lost',
  title: "Couldn't load your roster.",
  tail: 'The signal dropped. Try again.',
} as const;

export const PROFILE_LOAD_ERROR_COPY = {
  art: 'unplugged' satisfies StateArtId,
  kicker: 'Client profile · Signal lost',
  title: "Couldn't load this client.",
  tail: 'The signal dropped. Try again.',
} as const;

export const CLIENT_PLAN_LOAD_ERROR_COPY = {
  art: 'unplugged' satisfies StateArtId,
  title: (clientName: string) => `Couldn't load ${firstName(clientName, 'their')}'s plan.`,
  tail: 'Check your connection and try again.',
} as const;

export const CLIENT_NOT_FOUND_COPY = {
  art: 'lost' satisfies StateArtId,
  title: "Can't find this client.",
  tail: 'They may have been removed, or the link is out of date.',
  back: 'Back to clients',
} as const;

/** Roster to-do is empty: nobody is waiting on the coach */
export const ALL_CLEAR_COPY = {
  art: 'caughtUp' satisfies StateArtId,
  title: 'All caught up.',
  // Second line: ROSTER_COPY.allClear
} as const;

/** A search over clients, plans or exercises that found nothing */
export const NO_MATCH_COPY = {
  art: 'search' satisfies StateArtId,
  title: (query: string) => `Nothing matches “${query}”.`,
  clients: 'Try a first name or an email.',
  plans: 'Try a shorter name.',
} as const;

export const NO_PAST_CLIENTS_COPY = {
  art: 'logbook' satisfies StateArtId,
  title: 'No past clients.',
  tail: 'When coaching ends, it lands here.',
  body: 'With its history intact and a way back.',
} as const;

export const CLIENT_NO_WORKOUTS_COPY = {
  art: 'logbook' satisfies StateArtId,
  title: 'No workouts yet.',
  tail: (clientName: string) => `Workouts ${firstName(clientName, 'they')} completes show up here.`,
} as const;

export const CLIENT_NO_CHECKINS_COPY = {
  art: 'inbox' satisfies StateArtId,
  title: 'No check-ins yet.',
  tail: (clientName: string) => `Completed check-ins with ${firstName(clientName, 'them')} show up here.`,
} as const;

export const COACH_CHAT_EMPTY_COPY = {
  art: 'inbox' satisfies StateArtId,
  title: 'Start the conversation.',
} as const;

export const NO_ACTIVE_CHECKIN_COPY = {
  art: 'inbox' satisfies StateArtId,
  title: 'No active check-in.',
  tail: (clientName: string) => `Start one to hear how ${firstName(clientName, 'they')} is doing.`,
} as const;

/**
 * Setup calls: every beta coach gets one, booked on Cal.com from the waitlist
 * confirmation screen (or from the link in their invite email). Booking sends
 * the beta invite straight away; the Cal.com webhook (api/webhooks/cal) does
 * that, and records the call on the waitlist entry.
 *
 * Safe to import from client components: no Node APIs, and the only env var
 * read is NEXT_PUBLIC_, which Next inlines at build time.
 */

/**
 * The Cal.com event type to book, as "username/event-slug", from
 * NEXT_PUBLIC_CAL_SETUP_CALL_LINK. A full https://cal.com/... URL is accepted
 * too. Null when unset or malformed: the booking step then simply isn't
 * offered, and the waitlist works as it did before.
 */
export function setupCallLink(): string | null {
  return normalizeCalLink(process.env.NEXT_PUBLIC_CAL_SETUP_CALL_LINK);
}

export function normalizeCalLink(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const link = raw
    .trim()
    .replace(/^https?:\/\/(app\.)?cal\.com\//i, '')
    .split(/[?#]/)[0]
    .replace(/^\/+|\/+$/g, '');
  // An event type, not a profile page: at least "username/slug"
  return /^[\w.-]+(\/[\w.-]+)+$/.test(link) ? link : null;
}

/** The event type's slug, which Cal.com sends as `type` in webhooks. */
export function setupCallEventSlug(link: string): string {
  return link.split('/').pop() ?? link;
}

/** The public booking page, with the email filled in when known. */
export function setupCallBookingUrl(link: string, email?: string): string {
  const url = `https://cal.com/${link}`;
  return email ? `${url}?email=${encodeURIComponent(email)}` : url;
}

/**
 * Whether a waitlist signup is offered a setup call, from their answer to
 * "how many clients are you coaching right now?". Someone not coaching yet
 * has nothing to bring across, so the call's time goes to coaches who do.
 * A skipped question still gets the offer: most people who skip are coaches.
 */
export function offersSetupCall(clientCount: string | null | undefined): boolean {
  return clientCount !== 'not-coaching';
}

function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

/**
 * "Tuesday, November 18 at 2:00 PM GMT+1" in the coach's own time zone
 * (from the booking), falling back to UTC when it's missing or unknown.
 */
export function formatCallTime(startsAt: Date, timeZone?: string | null): string {
  const tz = timeZone && isValidTimeZone(timeZone) ? timeZone : 'UTC';
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: tz,
    timeZoneName: 'short',
  }).format(startsAt);
}

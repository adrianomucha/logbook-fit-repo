/**
 * Waitlist → private beta flow helpers.
 *
 * While the product is in private beta, coach signup is invite-only: the
 * owner sends beta invites from /admin/waitlist, and /signup only creates
 * COACH accounts for a valid, unredeemed waitlist invite token. Client
 * signups are unaffected — they're already gated by coach invites.
 */

/**
 * True when coach accounts may be created without a beta invite. Off by
 * default (the beta is closed); set OPEN_COACH_SIGNUP=true for local dev
 * or when the beta opens to the public.
 */
export function isCoachSignupOpen(): boolean {
  return process.env.OPEN_COACH_SIGNUP === "true";
}

/**
 * Absolute origin for links that leave the app (e.g. invite emails).
 * NEXTAUTH_URL is the canonical origin when set; the Vercel fallbacks cover
 * deploys where only the platform-injected vars exist.
 */
export function appBaseUrl(): string {
  const explicit = process.env.NEXTAUTH_URL;
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercel =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

/** Relative signup path a beta invite unlocks. */
export function waitlistInvitePath(token: string): string {
  return `/signup?beta=${encodeURIComponent(token)}`;
}

/**
 * The optional setup-call booking page (a Calendly event link, or any
 * scheduling URL), or null when none is configured. Only https URLs count:
 * a typo here would otherwise ship as a dead link in every invitation.
 *
 * This is the preferred route for setup help — a coach picks a slot
 * themselves instead of replying and waiting. When it's set, the invitation
 * email and the account-creation page link to it; the reply-to-book line
 * (WAITLIST_REPLY_TO_EMAIL) is only used when this is unset.
 */
export function setupCallBookingUrl(): string | null {
  const raw = process.env.SETUP_CALL_BOOKING_URL?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/**
 * Pre-fills the booking page with what we already know so the coach doesn't
 * retype it. Calendly reads `name` and `email` from the query string; other
 * schedulers may not, so the params are only added for calendly.com hosts.
 * Pure, so the client-side signup page can call it with the email it has.
 */
export function withBookingPrefill(
  bookingUrl: string,
  prefill: { email?: string | null; name?: string | null }
): string {
  let url: URL;
  try {
    url = new URL(bookingUrl);
  } catch {
    return bookingUrl;
  }
  const host = url.hostname.toLowerCase();
  if (host !== "calendly.com" && !host.endsWith(".calendly.com")) {
    return bookingUrl;
  }
  const email = prefill.email?.trim();
  const name = prefill.name?.trim();
  if (email) url.searchParams.set("email", email);
  if (name) url.searchParams.set("name", name);
  return url.toString();
}

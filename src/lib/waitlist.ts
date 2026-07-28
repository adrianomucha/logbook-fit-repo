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

/**
 * Admin gating for owner-only surfaces (e.g. the waitlist dashboard).
 *
 * Access is granted to any email listed in the ADMIN_EMAILS env var
 * (comma-separated, case-insensitive). Kept deliberately simple — there's
 * no admin role in the schema; this is an allowlist the owner controls.
 */

import { createHash, timingSafeEqual } from "crypto";

/** Emails allowed into admin surfaces, normalized to lowercase. */
function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** True when `email` is on the admin allowlist. */
export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return adminEmails().includes(email.trim().toLowerCase());
}

/** Extracts the bearer token from a request's Authorization header, if present. */
export function bearerToken(req: Request): string | null {
  const header = req.headers.get("authorization");
  const match = header?.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

/**
 * Timing-safe string comparison. Compares via SHA-256 digests so
 * timingSafeEqual accepts unequal lengths.
 */
function tokenMatches(token: string, expected: string): boolean {
  return timingSafeEqual(
    createHash("sha256").update(token).digest(),
    createHash("sha256").update(expected).digest()
  );
}

/**
 * True when `token` matches WAITLIST_ADMIN_TOKEN or, to allow zero-downtime
 * rotation, WAITLIST_ADMIN_TOKEN_PREVIOUS. To rotate: move the live value to
 * _PREVIOUS, set a fresh WAITLIST_ADMIN_TOKEN, migrate scripts, then unset
 * _PREVIOUS. Always false when no env var is set, so a missing token can
 * never be bypassed with an empty string.
 */
export function isValidAdminToken(token?: string | null): boolean {
  if (!token) return false;
  const accepted = [
    process.env.WAITLIST_ADMIN_TOKEN,
    process.env.WAITLIST_ADMIN_TOKEN_PREVIOUS,
  ].filter((t): t is string => Boolean(t));
  return accepted.some((expected) => tokenMatches(token, expected));
}

/**
 * True when `token` matches CRON_SECRET — the credential Vercel Cron sends as
 * a bearer token on scheduled invocations. Separate from the admin token so a
 * leaked export script can't trigger scheduled work, and vice versa.
 *
 * Fails closed when CRON_SECRET is unset: an unauthenticated caller must never
 * be able to drive the scheduler, so on a deploy that forgot the secret the
 * cron endpoint refuses everything (and says so in its 401).
 */
export function isValidCronToken(token?: string | null): boolean {
  if (!token) return false;
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  return tokenMatches(token, expected);
}

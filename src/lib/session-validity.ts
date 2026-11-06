/**
 * Session revocation, shared by every place a login is accepted.
 *
 * Both kinds of login are stateless 30-day tokens (the NextAuth cookie and
 * the mobile bearer token, lib/mobile-token.ts), so nothing can be deleted
 * to end one. Instead each carries `authTime`, the epoch second it signed in
 * (kept across NextAuth's rolling re-encodes and mobile refreshes, unlike
 * `iat`), and the account carries `sessionsValidAfter`. A login whose
 * authTime is earlier than that is dead. A password change or reset moves
 * the cutoff to "now", which ends every other device's login at once.
 *
 * Tokens from before authTime existed read as 0, so they die on the
 * account's first cutoff, which is the right answer: they predate it.
 */

/** The current epoch second, the unit authTime is stored in. */
export function nowEpochSeconds(now = Date.now()): number {
  return Math.floor(now / 1000);
}

/** The cutoff to store for "every login up to now is revoked". */
export function revokeSessionsAt(now = Date.now()): Date {
  return new Date(nowEpochSeconds(now) * 1000);
}

/**
 * True when a login that signed in at `authTime` (epoch seconds, undefined
 * for tokens that predate the claim) survives the account's cutoff.
 * Inclusive: the credential re-issued in the same second as the cutoff (to
 * keep the device that changed the password signed in) stays valid.
 */
export function sessionStillValid(
  authTime: number | undefined,
  sessionsValidAfter: Date | null | undefined
): boolean {
  if (!sessionsValidAfter) return true;
  return (authTime ?? 0) >= nowEpochSeconds(sessionsValidAfter.getTime());
}

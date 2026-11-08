/**
 * Session revocation, shared by every place a login is accepted.
 *
 * Both kinds of login are stateless 30-day tokens (the NextAuth cookie and
 * the mobile bearer token, lib/mobile-token.ts), so nothing can be deleted
 * to end one. Instead each records `sessionVersion`, the account's version
 * when it signed in (kept across NextAuth's rolling re-encodes and mobile
 * refreshes), and only logins at the account's current version are valid.
 * A password change or reset increments the version, which ends every
 * existing login at once; the device that made the change is handed a
 * fresh login at the new version.
 *
 * An exact counter rather than a timestamp: any clock comparison leaves a
 * window where a login from just before the change still matches.
 *
 * Tokens from before the claim existed read as version 0, which is every
 * account's starting version, so they keep working until that account's
 * first password change, and no later.
 */
export function sessionStillValid(
  tokenVersion: number | undefined,
  accountVersion: number
): boolean {
  return (tokenVersion ?? 0) === accountVersion;
}

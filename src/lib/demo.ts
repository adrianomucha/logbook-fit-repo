/**
 * Demo-access gating for the seeded demo accounts (see prisma/seed.ts).
 *
 * The demo credentials are public — they're printed on the login page and
 * live in this repo — so hiding the login buttons is not a lock. The lock is
 * server-side: while demo mode is off, demo accounts can't sign in and
 * already-issued demo sessions are rejected.
 *
 * Controlled by NEXT_PUBLIC_DEMO_MODE:
 *   - "true"  → demo access on (e.g. a preview/staging deployment)
 *   - "false" → demo access off
 *   - unset   → on in local dev (`next dev`), off in any deployed build
 *
 * NEXT_PUBLIC_ so the login page can hide the demo buttons with the same
 * flag. The value is inlined at build time — changing it on Vercel takes a
 * redeploy, not just a restart.
 */

/** The two demo accounts offered on the login page. */
const DEMO_LOGIN_EMAILS = ["coach@logbook.fit", "client@logbook.fit"];

/** The remaining seeded demo clients. */
const DEMO_CLIENT_EMAILS = [
  "emma@demo.logbook.fit",
  "alex@demo.logbook.fit",
  "jordan@demo.logbook.fit",
];

/**
 * Every seeded demo account, named exactly.
 *
 * Deliberately an exhaustive list and not a match on the @demo.logbook.fit
 * subdomain: a suffix match also swallows real accounts that happen to live
 * there, and locking one of those out of a deployed build is invisible —
 * the sign-in is refused before the password is even checked, so it looks
 * exactly like a wrong password. Seeding a new demo account means adding it
 * here; prisma/seed.ts asserts that every account it creates is covered.
 */
const DEMO_EMAILS = new Set([...DEMO_LOGIN_EMAILS, ...DEMO_CLIENT_EMAILS]);

export function isDemoModeEnabled(): boolean {
  const flag = process.env.NEXT_PUBLIC_DEMO_MODE;
  if (flag === "true") return true;
  if (flag === "false") return false;
  return process.env.NODE_ENV === "development";
}

/** True when `email` belongs to a seeded demo account. */
export function isDemoAccount(email?: string | null): boolean {
  if (!email) return false;
  return DEMO_EMAILS.has(email.trim().toLowerCase());
}

/** True when `email` is a demo account and demo mode is currently off. */
export function isLockedDemoAccount(email?: string | null): boolean {
  return isDemoAccount(email) && !isDemoModeEnabled();
}

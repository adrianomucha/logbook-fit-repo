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

/** The remaining seeded demo clients live under this subdomain. */
const DEMO_EMAIL_SUFFIX = "@demo.logbook.fit";

export function isDemoModeEnabled(): boolean {
  const flag = process.env.NEXT_PUBLIC_DEMO_MODE;
  if (flag === "true") return true;
  if (flag === "false") return false;
  return process.env.NODE_ENV === "development";
}

/** True when `email` belongs to a seeded demo account. */
export function isDemoAccount(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return (
    DEMO_LOGIN_EMAILS.includes(normalized) || normalized.endsWith(DEMO_EMAIL_SUFFIX)
  );
}

/** True when `email` is a demo account and demo mode is currently off. */
export function isLockedDemoAccount(email?: string | null): boolean {
  return isDemoAccount(email) && !isDemoModeEnabled();
}

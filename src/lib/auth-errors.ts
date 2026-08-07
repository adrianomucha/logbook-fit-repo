/**
 * Sign-in failures the UI is allowed to distinguish. Thrown from authorize()
 * in lib/auth.ts so `signIn(..., { redirect: false })` surfaces them as
 * `result.error`; anything else (unknown email, wrong password) stays a
 * generic null so login can't be used to probe which emails have accounts.
 * Rate-limited and locked-demo refusals carry no account information — the
 * honest message stops users from retrying a "wrong password" that isn't one.
 *
 * Lives apart from lib/auth.ts so the login page (a client component) can
 * import the codes without pulling prisma/bcrypt into the client bundle.
 */
export const LOGIN_ERROR_RATE_LIMITED = "rate_limited";
export const LOGIN_ERROR_DEMO_LOCKED = "demo_locked";

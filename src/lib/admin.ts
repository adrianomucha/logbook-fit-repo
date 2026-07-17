/**
 * Admin gating for owner-only surfaces (e.g. the waitlist dashboard).
 *
 * Access is granted to any email listed in the ADMIN_EMAILS env var
 * (comma-separated, case-insensitive). Kept deliberately simple — there's
 * no admin role in the schema; this is an allowlist the owner controls.
 */

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

/**
 * True when `token` matches WAITLIST_ADMIN_TOKEN. Always false when the env
 * var is unset, so a missing token can never be bypassed with an empty string.
 */
export function isValidAdminToken(token?: string | null): boolean {
  const expected = process.env.WAITLIST_ADMIN_TOKEN;
  if (!expected) return false;
  return token === expected;
}

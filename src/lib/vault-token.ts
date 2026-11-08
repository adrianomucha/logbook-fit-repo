import prisma from "@/lib/prisma";
import { tokenMatches } from "@/lib/admin";

/**
 * Bearer tokens held in Supabase Vault instead of a Vercel env var.
 *
 * For a scheduler that lives in the database (pg_cron): the token is generated
 * and stored there, the job reads it from there, and the endpoint checks it
 * against there, so it never has to be copied between dashboards. Reading it
 * takes the same database access as everything else the app does, which is
 * already total.
 *
 * Fails closed: no token, no such secret, an empty secret, or no vault at all
 * (local Postgres) all mean false.
 */

/** The vault secret pg_cron sends to /api/cron/idle-workouts. */
export const IDLE_WORKOUTS_VAULT_SECRET = "idle_workouts_token";

export async function isValidVaultToken(
  token: string | null | undefined,
  secretName: string
): Promise<boolean> {
  if (!token) return false;
  try {
    const rows = await prisma.$queryRaw<{ decrypted_secret: string | null }[]>`
      select decrypted_secret from vault.decrypted_secrets where name = ${secretName} limit 1
    `;
    const expected = rows[0]?.decrypted_secret;
    if (!expected) return false;
    return tokenMatches(token, expected);
  } catch (error) {
    console.error(`[CRON] Could not read vault secret ${secretName}:`, error);
    return false;
  }
}

import crypto from "crypto";

/**
 * Short-lived, single-audience tokens for the linked-account switch.
 *
 * A token is minted by POST /api/account/switch only for the account linked
 * to a live session, then immediately redeemed through the "account-switch"
 * credentials provider — so possession of a valid session for one half of
 * the pair is the only way to obtain a session for the other half. Stateless
 * by design: HMAC-SHA256 over the payload with NEXTAUTH_SECRET (the same
 * secret that already guards session JWTs), bound to a dedicated audience so
 * it can't be confused with any other signed artifact, and expiring fast
 * enough (60s) that storage/revocation would add nothing.
 */

const AUDIENCE = "account-switch";
const TTL_MS = 60 * 1000;

function secret(): string | null {
  return process.env.NEXTAUTH_SECRET ?? null;
}

function sign(payload: string, key: string): string {
  return crypto.createHmac("sha256", key).update(payload).digest("base64url");
}

/**
 * Mint a switch token for `userId`. Returns null when NEXTAUTH_SECRET is
 * unset (never the case in a running deployment — next-auth requires it).
 */
export function createSwitchToken(userId: string, now = Date.now()): string | null {
  const key = secret();
  if (!key || !userId) return null;
  const payload = Buffer.from(
    JSON.stringify({ aud: AUDIENCE, uid: userId, exp: now + TTL_MS })
  ).toString("base64url");
  return `${payload}.${sign(payload, key)}`;
}

/**
 * Verify a switch token and return the target user id, or null for
 * anything that isn't a fresh, untampered token from createSwitchToken.
 */
export function verifySwitchToken(
  token: string | null | undefined,
  now = Date.now()
): string | null {
  const key = secret();
  if (!key || !token) return null;

  const [payload, mac] = token.split(".");
  if (!payload || !mac) return null;

  const expected = Buffer.from(sign(payload, key));
  const given = Buffer.from(mac);
  if (
    expected.length !== given.length ||
    !crypto.timingSafeEqual(expected, given)
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (parsed.aud !== AUDIENCE) return null;
    if (typeof parsed.uid !== "string" || !parsed.uid) return null;
    if (typeof parsed.exp !== "number" || parsed.exp <= now) return null;
    return parsed.uid;
  } catch {
    return null;
  }
}

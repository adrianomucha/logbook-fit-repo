import crypto from "crypto";

/**
 * Stateless password-reset tokens, cousin to the account-switch tokens in
 * switch-token.ts: HMAC-SHA256 over the payload with NEXTAUTH_SECRET, bound
 * to a dedicated audience.
 *
 * Single-use without storage: the payload carries a fingerprint of the
 * user's password hash at mint time. Completing a reset changes the hash,
 * so the fingerprint no longer matches and the token — plus any older
 * outstanding reset links — dies with it. Until then an unused link stays
 * valid, which the 30-minute TTL keeps acceptable.
 */

const AUDIENCE = "password-reset";
const TTL_MS = 30 * 60 * 1000;

function secret(): string | null {
  return process.env.NEXTAUTH_SECRET ?? null;
}

function sign(payload: string, key: string): string {
  return crypto.createHmac("sha256", key).update(payload).digest("base64url");
}

/**
 * Fingerprint of a bcrypt password hash for embedding in the token payload.
 * One-way (SHA-256, truncated) so the token never carries hash material an
 * offline cracker could use.
 */
export function passwordFingerprint(passwordHash: string): string {
  return crypto
    .createHash("sha256")
    .update(passwordHash)
    .digest("base64url")
    .slice(0, 16);
}

/**
 * Mint a reset token for `userId` whose current password hash is
 * `passwordHash`. Returns null when NEXTAUTH_SECRET is unset (never the
 * case in a running deployment — next-auth requires it).
 */
export function createResetToken(
  userId: string,
  passwordHash: string,
  now = Date.now()
): string | null {
  const key = secret();
  if (!key || !userId || !passwordHash) return null;
  const payload = Buffer.from(
    JSON.stringify({
      aud: AUDIENCE,
      uid: userId,
      pwf: passwordFingerprint(passwordHash),
      exp: now + TTL_MS,
    })
  ).toString("base64url");
  return `${payload}.${sign(payload, key)}`;
}

/**
 * Verify a reset token's signature, audience, and expiry. Returns the
 * target user id and minted-against fingerprint, or null for anything that
 * isn't a fresh, untampered token from createResetToken. The caller must
 * still compare `fingerprint` against passwordFingerprint(current hash) —
 * that comparison is what makes the token single-use.
 */
export function verifyResetToken(
  token: string | null | undefined,
  now = Date.now()
): { userId: string; fingerprint: string } | null {
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
    if (typeof parsed.pwf !== "string" || !parsed.pwf) return null;
    if (typeof parsed.exp !== "number" || parsed.exp <= now) return null;
    return { userId: parsed.uid, fingerprint: parsed.pwf };
  } catch {
    return null;
  }
}

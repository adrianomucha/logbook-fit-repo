import crypto from "crypto";

/**
 * Generates a cryptographically secure token using random bytes.
 * Returns a URL-safe base64 string (43 chars for 32 bytes = 256 bits of entropy).
 */
export function generateSecureToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

import prisma from "@/lib/prisma";
import { verifyMobileToken } from "@/lib/mobile-token";

export type BearerUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

/**
 * Resolves the active user behind an `Authorization: Bearer <jwt>` header.
 *
 * The token is a 30-day credential, so its claims can go stale within its
 * lifetime: the account may be soft-deleted, or the email/role may change.
 * Every Bearer request therefore re-reads the user row — a deleted account's
 * token stops working immediately, and callers always see current values
 * rather than what was true at login.
 *
 * Returns null when the header is missing/malformed, the token fails
 * verification, or the user no longer exists as an active account.
 */
export async function getBearerUser(req: Request): Promise<BearerUser | null> {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;

  const payload = await verifyMobileToken(header.slice(7).trim());
  if (!payload) return null;

  return prisma.user.findFirst({
    where: { id: payload.userId, deletedAt: null },
    select: { id: true, name: true, email: true, role: true },
  });
}

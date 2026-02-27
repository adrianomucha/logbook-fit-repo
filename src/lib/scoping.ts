import { Session } from "next-auth";
import prisma from "@/lib/prisma";

/**
 * Returns the CoachProfile.id for the authenticated coach.
 * Throws if user is not a coach or profile not found.
 */
export async function getCoachProfileId(session: Session): Promise<string> {
  const profile = await prisma.coachProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!profile) throw new Error("Coach profile not found");
  return profile.id;
}

/**
 * Returns the ClientProfile.id for the authenticated client.
 * Throws if user is not a client or profile not found.
 */
export async function getClientProfileId(session: Session): Promise<string> {
  const profile = await prisma.clientProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!profile) throw new Error("Client profile not found");
  return profile.id;
}

/**
 * Prisma where-clause fragment that scopes to the authenticated coach.
 * Includes deletedAt: null to filter out soft-deleted resources.
 * Usage: prisma.plan.findMany({ where: { ...coachScope(coachProfileId) } })
 */
export function coachScope(coachProfileId: string) {
  return { coachId: coachProfileId, deletedAt: null };
}

/**
 * Prisma where-clause fragment that scopes to the authenticated client.
 * Usage: prisma.workoutCompletion.findMany({ where: { ...clientScope(clientProfileId) } })
 */
export function clientScope(clientProfileId: string) {
  return { clientId: clientProfileId };
}

/**
 * Verifies a coach owns a specific resource. Returns false if not owned.
 * Callers should return 404 (not 403) to prevent enumeration.
 */
export async function verifyCoachOwnership(
  coachProfileId: string,
  resourceType: "plan" | "exercise",
  resourceId: string
): Promise<boolean> {
  const count = await (prisma[resourceType] as unknown as { count: (args: { where: Record<string, string | null> }) => Promise<number> }).count({
    where: { id: resourceId, coachId: coachProfileId, deletedAt: null },
  });
  return count > 0;
}

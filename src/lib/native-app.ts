import prisma from "@/lib/prisma";

/**
 * Notes that an account has signed in from the native app, the first time it
 * does. Called from the mobile login and refresh routes.
 *
 * A website cannot detect an installed app, so this is how the web learns
 * about it: /api/me reports `hasNativeApp`, and the install banner stays
 * quiet for a client who already has the real thing.
 *
 * Never throws. A missed write costs one unwanted banner; a thrown one would
 * cost a sign-in.
 */
export async function recordNativeAppUse(userId: string): Promise<void> {
  try {
    // Only the first sighting writes, so an app launch is not a row update.
    await prisma.user.updateMany({
      where: { id: userId, nativeAppFirstSeenAt: null },
      data: { nativeAppFirstSeenAt: new Date() },
    });
  } catch (error) {
    console.error("[NATIVE_APP] Could not record native app use:", userId, error);
  }
}

import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { isLockedDemoAccount } from "@/lib/demo";
import { getPushPublicKey, isPushConfigured } from "@/lib/push";

/**
 * GET /api/push/config
 * Tells the browser whether push is available on this deployment and hands
 * back the VAPID public key it needs to subscribe.
 *
 * Served from an endpoint rather than a NEXT_PUBLIC_ env var so the key is
 * read at request time — rotating it (or enabling push on an already-built
 * deployment) doesn't require a rebuild.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || isLockedDemoAccount(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    enabled: isPushConfigured(),
    publicKey: getPushPublicKey(),
  });
}

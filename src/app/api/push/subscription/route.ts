import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { isLockedDemoAccount } from "@/lib/demo";
import prisma from "@/lib/prisma";
import { isPushConfigured } from "@/lib/push";
import { parseBody } from "@/lib/validations/parseBody";
import {
  pushSubscriptionSchema,
  pushUnsubscribeSchema,
} from "@/lib/validations/schemas";

/**
 * POST /api/push/subscription
 * Registers this browser/device for push notifications.
 *
 * Endpoints are globally unique, so the same device re-subscribing (or a
 * different account signing in on it) updates the existing row rather than
 * stacking duplicates — which would deliver every notification twice.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || isLockedDemoAccount(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isPushConfigured()) {
    return NextResponse.json(
      { error: "Push notifications are not configured on this server" },
      { status: 503 }
    );
  }

  const result = await parseBody(req, pushSubscriptionSchema);
  if (!result.success) return result.response;
  const { endpoint, keys } = result.data;

  const userAgent = req.headers.get("user-agent")?.slice(0, 255) ?? null;

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: {
      userId: session.user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      userAgent,
    },
    update: {
      userId: session.user.id,
      p256dh: keys.p256dh,
      auth: keys.auth,
      userAgent,
      lastUsedAt: new Date(),
    },
  });

  return NextResponse.json({ subscribed: true }, { status: 201 });
}

/**
 * DELETE /api/push/subscription
 * Removes this device's registration. Scoped to the caller so one account
 * can't unsubscribe another's devices.
 */
export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session || isLockedDemoAccount(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await parseBody(req, pushUnsubscribeSchema);
  if (!result.success) return result.response;

  await prisma.pushSubscription.deleteMany({
    where: { endpoint: result.data.endpoint, userId: session.user.id },
  });

  return NextResponse.json({ subscribed: false });
}

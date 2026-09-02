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
 * Two shapes: a browser sends its `PushSubscription.toJSON()` (a WEB row,
 * needs VAPID on the server); the native app sends
 * `{provider: "EXPO", token, deviceName?}` (an EXPO row, needs nothing —
 * Expo's service delivers with the app's own APNs credentials).
 *
 * Endpoints and tokens are globally unique per device, so the same device
 * re-subscribing (or a different account signing in on it) updates the
 * existing row rather than stacking duplicates — which would deliver every
 * notification twice.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || isLockedDemoAccount(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await parseBody(req, pushSubscriptionSchema);
  if (!result.success) return result.response;
  const data = result.data;

  const userAgent = req.headers.get("user-agent")?.slice(0, 255) ?? null;

  const row =
    "provider" in data
      ? {
          provider: "EXPO" as const,
          endpoint: data.token,
          p256dh: null,
          auth: null,
          userAgent: data.deviceName || userAgent,
        }
      : {
          provider: "WEB" as const,
          endpoint: data.endpoint,
          p256dh: data.keys.p256dh,
          auth: data.keys.auth,
          userAgent,
        };

  if (row.provider === "WEB" && !isPushConfigured()) {
    return NextResponse.json(
      { error: "Push notifications are not configured on this server" },
      { status: 503 }
    );
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint: row.endpoint },
    create: { userId: session.user.id, ...row },
    update: { userId: session.user.id, ...row, lastUsedAt: new Date() },
  });

  return NextResponse.json({ subscribed: true }, { status: 201 });
}

/**
 * DELETE /api/push/subscription
 * Removes this device's registration — `{endpoint}` from a browser,
 * `{provider: "EXPO", token}` from the app. Scoped to the caller so one
 * account can't unsubscribe another's devices.
 */
export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session || isLockedDemoAccount(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await parseBody(req, pushUnsubscribeSchema);
  if (!result.success) return result.response;
  const endpoint =
    "provider" in result.data ? result.data.token : result.data.endpoint;

  await prisma.pushSubscription.deleteMany({
    where: { endpoint, userId: session.user.id },
  });

  return NextResponse.json({ subscribed: false });
}

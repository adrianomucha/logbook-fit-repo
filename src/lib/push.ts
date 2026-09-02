/**
 * Web Push delivery.
 *
 * Notifications are best-effort and must never break the action that
 * triggered them: every entry point here swallows transport errors and
 * returns a count instead of throwing. A message that saved but failed to
 * notify is a much smaller problem than a message that failed to save.
 *
 * Configuration is entirely server-side (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY).
 * With the keys unset the whole feature no-ops — local dev and preview
 * deployments keep working, and the UI hides the opt-in via /api/push/config.
 * Generate a pair with: npx web-push generate-vapid-keys
 */
import webpush from "web-push";
import { Expo, type ExpoPushMessage } from "expo-server-sdk";
import prisma from "@/lib/prisma";
import type { PushSubscription } from "@prisma/client";

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
// Push services want a contact for the sender; mailto: or an https URL.
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:support@logbook.fit";

/** True when VAPID keys are configured and pushes can actually be sent. */
export function isPushConfigured(): boolean {
  return Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
}

/** The public key browsers need to create a subscription. */
export function getPushPublicKey(): string | null {
  return isPushConfigured() ? VAPID_PUBLIC_KEY! : null;
}

let vapidReady = false;
function ensureVapid(): boolean {
  if (!isPushConfigured()) return false;
  if (!vapidReady) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY!, VAPID_PRIVATE_KEY!);
    vapidReady = true;
  }
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  /** In-app path the notification opens (must be same-origin). */
  url: string;
  /**
   * Collapse key. Repeat messages from the same person replace the previous
   * notification instead of stacking a wall of them on the lock screen.
   */
  tag?: string;
}

// ──────────────────────────────────────
// Expo (native app) transport
// ──────────────────────────────────────

/**
 * Expo's push service needs nothing from this server to deliver: the app's
 * EAS project holds the APNs key, and the token the device registers is the
 * whole address. So unlike Web Push there is no "configured" state — an
 * EXPO row is always deliverable. EXPO_ACCESS_TOKEN is optional and only
 * checked by Expo once "enhanced push security" is switched on for the
 * project.
 */
let expoClient: Expo | null = null;
function expo(): Expo {
  if (!expoClient) {
    const accessToken = process.env.EXPO_ACCESS_TOKEN;
    expoClient = new Expo(accessToken ? { accessToken } : {});
  }
  return expoClient;
}

/** A day-old "new message" ping is still useful; older than that is noise. */
const PUSH_TTL_SEC = 60 * 60 * 24;

/** APNs rejects a collapse id over 64 bytes; ours are ascii, so chars work. */
const COLLAPSE_ID_MAX = 64;

/**
 * The Expo message for a payload. Pure so it can be unit-tested. `url` and
 * `tag` ride in `data` for the app's notification handler; `tag` also
 * becomes the collapse id (later notification replaces earlier, like the
 * service worker's `tag`) and the thread id (grouped on the lock screen).
 */
export function buildExpoMessage(
  token: string,
  payload: PushPayload
): ExpoPushMessage {
  const collapse = payload.tag?.slice(0, COLLAPSE_ID_MAX);
  return {
    to: token,
    title: payload.title,
    body: payload.body,
    sound: "default",
    ttl: PUSH_TTL_SEC,
    data: { url: payload.url, ...(payload.tag ? { tag: payload.tag } : {}) },
    ...(collapse ? { collapseId: collapse, threadId: collapse } : {}),
  };
}

interface SendOutcome {
  delivered: number;
  /** Endpoints/tokens the provider says will never deliver again. */
  stale: string[];
}

async function sendExpoPush(
  subscriptions: PushSubscription[],
  payload: PushPayload
): Promise<SendOutcome> {
  const outcome: SendOutcome = { delivered: 0, stale: [] };
  if (subscriptions.length === 0) return outcome;

  const messages = subscriptions.map((sub) =>
    buildExpoMessage(sub.endpoint, payload)
  );

  // Expo caps a request at 100 messages; chunking keeps a coach with many
  // devices (or a future fan-out) inside it.
  for (const chunk of expo().chunkPushNotifications(messages)) {
    let tickets;
    try {
      tickets = await expo().sendPushNotificationsAsync(chunk);
    } catch (error) {
      console.error("[PUSH] expo send failed:", error);
      continue;
    }
    // The nth ticket answers the nth message of the chunk.
    tickets.forEach((ticket, i) => {
      if (ticket.status === "ok") {
        outcome.delivered += 1;
        return;
      }
      // The app was uninstalled or its token rotated — nothing will ever be
      // delivered there again, so drop the row (Web Push's 404/410).
      if (ticket.details?.error === "DeviceNotRegistered") {
        outcome.stale.push(String(chunk[i].to));
      } else {
        console.error("[PUSH] expo rejected:", ticket.details?.error ?? ticket.message);
      }
    });
  }
  return outcome;
}

// ──────────────────────────────────────
// Web Push (browser) transport
// ──────────────────────────────────────

async function sendWebPush(
  subscriptions: PushSubscription[],
  payload: PushPayload
): Promise<SendOutcome> {
  const outcome: SendOutcome = { delivered: 0, stale: [] };
  if (subscriptions.length === 0 || !ensureVapid()) return outcome;

  const body = JSON.stringify(payload);
  await Promise.all(
    subscriptions.map(async (sub) => {
      // A WEB row always has keys (enforced by a DB check); guard anyway so a
      // bad row can't throw its way out of a notification.
      if (!sub.p256dh || !sub.auth) return;
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body,
          { TTL: PUSH_TTL_SEC }
        );
        outcome.delivered += 1;
      } catch (error) {
        // 404/410 mean the browser threw the subscription away (permission
        // revoked, PWA uninstalled, profile cleared). Nothing will ever be
        // delivered there again, so drop the row.
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          outcome.stale.push(sub.endpoint);
        } else {
          console.error("[PUSH] send failed:", statusCode ?? error);
        }
      }
    })
  );
  return outcome;
}

/**
 * Send a notification to every device a user has registered — browsers over
 * Web Push, the native app over Expo — and return how many accepted it
 * (0 when the user has no devices, Web Push is unconfigured and they only
 * have browsers, or every send failed).
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<number> {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });
  if (subscriptions.length === 0) return 0;

  const [web, native] = await Promise.all([
    sendWebPush(subscriptions.filter((s) => s.provider === "WEB"), payload),
    sendExpoPush(subscriptions.filter((s) => s.provider === "EXPO"), payload),
  ]);

  const stale = [...web.stale, ...native.stale];
  if (stale.length > 0) {
    await prisma.pushSubscription
      .deleteMany({ where: { endpoint: { in: stale } } })
      .catch(() => {
        /* cleanup is opportunistic */
      });
  }

  const delivered = web.delivered + native.delivered;
  if (delivered > 0) {
    await prisma.pushSubscription
      .updateMany({
        where: { userId },
        data: { lastUsedAt: new Date() },
      })
      .catch(() => {
        /* bookkeeping only */
      });
  }

  return delivered;
}

/** Trim a message to a lock-screen-sized preview. */
export function previewText(content: string, maxLength = 120): string {
  const collapsed = content.replace(/\s+/g, " ").trim();
  return collapsed.length > maxLength
    ? `${collapsed.slice(0, maxLength - 1)}…`
    : collapsed;
}

/**
 * Notify the recipient of a new chat message. Never throws — a failed
 * notification must not fail the send.
 *
 * `url` is where tapping the notification lands: the two apps keep their
 * threads in different places (the coach's under the client's profile, the
 * client's on their chat tab), so the caller — which already knows both
 * profiles — supplies it.
 */
export async function notifyNewMessage(params: {
  recipientId: string;
  senderId: string;
  senderName: string | null;
  content: string;
  url: string;
}): Promise<void> {
  const { recipientId, senderId, senderName, content, url } = params;
  try {
    await sendPushToUser(recipientId, {
      title: senderName?.trim() || "New message",
      body: previewText(content),
      url,
      tag: `message:${senderId}`,
    });
  } catch (error) {
    console.error("[PUSH] notifyNewMessage failed:", error);
  }
}

/**
 * Notify a client that their coach sent a check-in.
 *
 * The check-in loop is the product's north star, but until now only chat
 * messages notified — so the one prompt the whole retention model depends on
 * arrived silently and was found only if the client happened to open the app.
 * Tagged per client so a re-sent check-in replaces the old notification.
 */
export async function notifyCheckInSent(params: {
  clientUserId: string;
  coachName: string | null;
}): Promise<void> {
  const { clientUserId, coachName } = params;
  try {
    await sendPushToUser(clientUserId, {
      title: coachName?.trim()
        ? `${coachName.trim()} sent a check-in`
        : "New check-in",
      body: "Tell them how your training is going.",
      url: "/client?tab=checkin",
      tag: `checkin:${clientUserId}`,
    });
  } catch (error) {
    console.error("[PUSH] notifyCheckInSent failed:", error);
  }
}

/** Notify a coach that a client answered their check-in. */
export async function notifyCheckInResponse(params: {
  coachUserId: string;
  clientName: string | null;
  clientProfileId: string;
}): Promise<void> {
  const { coachUserId, clientName, clientProfileId } = params;
  try {
    await sendPushToUser(coachUserId, {
      title: clientName?.trim()
        ? `${clientName.trim()} answered your check-in`
        : "Check-in answered",
      body: "Read their response and reply.",
      url: `/coach/clients/${clientProfileId}`,
      tag: `checkin-response:${clientProfileId}`,
    });
  } catch (error) {
    console.error("[PUSH] notifyCheckInResponse failed:", error);
  }
}

/** Notify a client that their coach replied to their check-in. */
export async function notifyCheckInFeedback(params: {
  clientUserId: string;
  coachName: string | null;
}): Promise<void> {
  const { clientUserId, coachName } = params;
  try {
    await sendPushToUser(clientUserId, {
      title: coachName?.trim()
        ? `${coachName.trim()} replied to your check-in`
        : "Check-in reply",
      body: "See what your coach said.",
      url: "/client?tab=checkin",
      tag: `checkin-feedback:${clientUserId}`,
    });
  } catch (error) {
    console.error("[PUSH] notifyCheckInFeedback failed:", error);
  }
}

/** Notify a client that a training plan is waiting for them. */
export async function notifyPlanAssigned(params: {
  clientUserId: string;
  coachName: string | null;
  planName: string;
}): Promise<void> {
  const { clientUserId, coachName, planName } = params;
  try {
    await sendPushToUser(clientUserId, {
      title: coachName?.trim()
        ? `${coachName.trim()} assigned your plan`
        : "Your plan is ready",
      body: previewText(planName),
      url: "/client",
      tag: `plan:${clientUserId}`,
    });
  } catch (error) {
    console.error("[PUSH] notifyPlanAssigned failed:", error);
  }
}

/** Notify a coach that an invited client created their account. */
export async function notifyClientJoined(params: {
  coachUserId: string;
  clientName: string | null;
  clientProfileId: string;
}): Promise<void> {
  const { coachUserId, clientName, clientProfileId } = params;
  try {
    await sendPushToUser(coachUserId, {
      title: clientName?.trim()
        ? `${clientName.trim()} joined`
        : "A client joined",
      body: "Build their first plan to get them training.",
      url: `/coach/clients/${clientProfileId}`,
      tag: `client-joined:${clientProfileId}`,
    });
  } catch (error) {
    console.error("[PUSH] notifyClientJoined failed:", error);
  }
}

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
import prisma from "@/lib/prisma";

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

/**
 * Send a notification to every device a user has registered.
 * Returns the number of endpoints that accepted it (0 when push is
 * unconfigured, the user has no devices, or every send failed).
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<number> {
  if (!ensureVapid()) return 0;

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });
  if (subscriptions.length === 0) return 0;

  const body = JSON.stringify(payload);
  const staleEndpoints: string[] = [];

  const results = await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body,
          { TTL: 60 * 60 * 24 } // A day-old "new message" ping is still useful
        );
        return true;
      } catch (error) {
        // 404/410 mean the browser threw the subscription away (permission
        // revoked, PWA uninstalled, profile cleared). Nothing will ever be
        // delivered there again, so drop the row.
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          staleEndpoints.push(sub.endpoint);
        } else {
          console.error("[PUSH] send failed:", statusCode ?? error);
        }
        return false;
      }
    })
  );

  if (staleEndpoints.length > 0) {
    await prisma.pushSubscription
      .deleteMany({ where: { endpoint: { in: staleEndpoints } } })
      .catch(() => {
        /* cleanup is opportunistic */
      });
  }

  const delivered = results.filter(Boolean).length;
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

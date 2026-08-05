/**
 * Browser half of Web Push: service-worker registration, permission, and
 * subscribe/unsubscribe against /api/push/subscription.
 *
 * The pure helpers (support detection, key decoding) live here rather than in
 * the hook so they can be unit-tested under the `node` test environment —
 * same split as `pwa-install.ts`.
 */

export const SERVICE_WORKER_PATH = "/sw.js";

/** Everything Web Push needs, present only on browsers that support it. */
export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/**
 * iOS only delivers Web Push to apps launched from the home screen (16.4+).
 * In Safari's normal tab the subscribe call fails, so the UI has to ask for
 * an install first instead of showing a button that can't work.
 */
export function isIosBrowser(snapshot?: {
  userAgent: string;
  maxTouchPoints: number;
}): boolean {
  const ua = snapshot?.userAgent ?? (typeof navigator !== "undefined" ? navigator.userAgent : "");
  const touchPoints =
    snapshot?.maxTouchPoints ??
    (typeof navigator !== "undefined" ? navigator.maxTouchPoints : 0);
  // iPadOS 13+ reports a desktop-Safari UA; touch points are the tell.
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && touchPoints > 1);
}

/** True when the page is running as an installed app. */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * VAPID keys travel as base64url text; PushManager wants raw bytes.
 * Exported for tests — a silently wrong decode fails at subscribe time with
 * an opaque browser error.
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration(SERVICE_WORKER_PATH);
  if (existing) return existing;
  return navigator.serviceWorker.register(SERVICE_WORKER_PATH);
}

/** The device's current subscription, if it already has one. */
export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.getRegistration(SERVICE_WORKER_PATH);
  if (!registration) return null;
  return registration.pushManager.getSubscription();
}

/**
 * Ask for permission, subscribe, and register the endpoint server-side.
 * Throws with a user-presentable message when it can't be done.
 */
export async function enablePushNotifications(publicKey: string): Promise<void> {
  if (!isPushSupported()) {
    throw new Error("This browser doesn't support notifications.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error(
      permission === "denied"
        ? "Notifications are blocked in your browser settings."
        : "Notification permission wasn't granted."
    );
  }

  const registration = await registerServiceWorker();
  // A registration that is still installing has no active worker to push to.
  await navigator.serviceWorker.ready;

  const existing = await registration.pushManager.getSubscription();
  // A subscription made with a different (rotated) VAPID key can't receive
  // our pushes — drop it and make a fresh one.
  if (existing) await existing.unsubscribe().catch(() => undefined);

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
  });

  const res = await fetch("/api/push/subscription", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscription.toJSON()),
  });
  if (!res.ok) {
    // Don't leave a device subscribed to a push service the server can't reach.
    await subscription.unsubscribe().catch(() => undefined);
    throw new Error("Couldn't turn on notifications. Please try again.");
  }
}

/** Unsubscribe this device and forget it server-side. */
export async function disablePushNotifications(): Promise<void> {
  const subscription = await getExistingSubscription();
  if (!subscription) return;
  const { endpoint } = subscription;
  await subscription.unsubscribe().catch(() => undefined);
  await fetch("/api/push/subscription", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint }),
  }).catch(() => undefined);
}

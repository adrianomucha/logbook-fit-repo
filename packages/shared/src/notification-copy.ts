/**
 * The alerts switch in Settings, worded once for web and app. The bodies list
 * every event `src/lib/push.ts` actually sends to that role — keep them in
 * step when a notify* entry point is added or removed.
 */
export const ALERTS_COPY = {
  title: 'Alerts',
  body: (role: 'coach' | 'client') =>
    role === 'coach'
      ? 'A push notification on this device when a client messages you, answers a check-in or joins. Alerts are per device, so turn them on wherever you coach from.'
      : 'A push notification on this device when your coach messages you, sends or answers a check-in, or assigns you a plan. Alerts are per device, so turn them on wherever you train from.',
} as const;

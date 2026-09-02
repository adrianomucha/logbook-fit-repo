import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { apiFetch } from './api';

/**
 * Native push, registered with the API as an EXPO subscription (see
 * DEVELOPMENT.md → "Push (native app)"). Expo's push service needs the
 * app's EAS project id to mint a token; without one (no `eas init` yet,
 * or Expo Go without a project) the whole feature reports unavailable
 * and the opt-in never appears — an offer the app can't honour is worse
 * than silence.
 */

const TOKEN_KEY = 'logbook.push.token.v1';

// Foreground notifications show as banners, like the web's in-app toast.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export function pushProjectId(): string | null {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? null;
}

/** Push can work on this device and build. */
export function isPushAvailable(): boolean {
  return Device.isDevice && pushProjectId() !== null;
}

export type PushPermission = 'granted' | 'denied' | 'undetermined';

export async function getPushPermission(): Promise<PushPermission> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined';
}

export async function storedPushToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

/** Ask for permission, mint the token, and register it. Throws with a readable message. */
export async function enablePush(): Promise<void> {
  const projectId = pushProjectId();
  if (!projectId) throw new Error('Notifications need a production build of the app.');

  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    ({ status } = await Notifications.requestPermissionsAsync());
  }
  if (status !== 'granted') throw new Error('Notifications are off for Logbook in Settings.');

  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  await apiFetch('/api/push/subscription', {
    method: 'POST',
    body: JSON.stringify({ provider: 'EXPO', token, deviceName: Device.deviceName ?? undefined }),
  });
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

/** Remove this device's registration. Safe to call when nothing is registered. */
export async function disablePush(): Promise<void> {
  const token = await storedPushToken();
  if (!token) return;
  try {
    await apiFetch('/api/push/subscription', {
      method: 'DELETE',
      body: JSON.stringify({ provider: 'EXPO', token }),
    });
  } finally {
    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => undefined);
  }
}

/**
 * Where a notification's `url` (a web path from lib/push.ts on the server)
 * lands in the app. The route tree mirrors the web's, so most paths pass
 * straight through; the web's `?tab=` query becomes the matching tab.
 */
export function resolveNotificationUrl(url: unknown): string | null {
  if (typeof url !== 'string' || !url.startsWith('/')) return null;
  const [path, query = ''] = url.split('?');
  const tab = new URLSearchParams(query).get('tab');
  if (path === '/client' || path === '/client/') {
    if (tab === 'chat') return '/client/chat';
    if (tab === 'progress') return '/client/progress';
    return '/client';
  }
  if (path.startsWith('/client/checkin/') || path.startsWith('/client/workout/')) return path;
  if (path.startsWith('/coach')) return '/coach';
  return '/client';
}

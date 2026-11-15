import { Platform } from 'react-native';
import { API_URL } from './config';

/**
 * Fire-and-forget crash report from the app's crash screens to the same
 * endpoint the web's error boundaries use, so a crash on someone's phone
 * reaches the operators instead of dying on the device.
 *
 * Must never throw: reporting a crash badly is worse than not reporting it.
 * No auth header on purpose: the endpoint takes anonymous reports, and a
 * crash can happen signed out.
 */
export function reportCrash(error: Error | undefined, screen: string): void {
  try {
    void fetch(`${API_URL}/api/client-errors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: String(error?.message ?? 'Unknown error').slice(0, 500),
        url: `${API_URL}/app/${screen}`,
        stack: error?.stack?.slice(0, 4000),
        platform: Platform.OS === 'android' ? 'android' : 'ios',
      }),
    }).catch(() => undefined);
  } catch {
    // Deliberately swallowed: see above.
  }
}

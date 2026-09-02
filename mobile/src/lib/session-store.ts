import * as SecureStore from 'expo-secure-store';

/**
 * The signed-in session, as returned by POST /api/auth/mobile/login and
 * /refresh. Lives in the keychain; the in-memory copy is what every API
 * request reads, so the keychain is touched only on launch and on change.
 */
export interface StoredSession {
  token: string;
  /** ISO timestamp. */
  expiresAt: string;
  user: { id: string; email: string; name: string; role: 'COACH' | 'CLIENT' };
}

const KEY = 'logbook.session.v1';

let cached: StoredSession | null | undefined;

export async function loadSession(): Promise<StoredSession | null> {
  if (cached !== undefined) return cached;
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    cached = raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    cached = null;
  }
  return cached;
}

export async function saveSession(session: StoredSession): Promise<void> {
  cached = session;
  await SecureStore.setItemAsync(KEY, JSON.stringify(session));
}

export async function clearSession(): Promise<void> {
  cached = null;
  await SecureStore.deleteItemAsync(KEY).catch(() => undefined);
}

/** Synchronous read for request headers — null until loadSession() has run. */
export function currentToken(): string | null {
  return cached?.token ?? null;
}

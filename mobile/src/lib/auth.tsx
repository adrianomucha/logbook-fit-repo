import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { SWRConfig } from 'swr';
import { ApiError, apiFetch, fetcher } from './api';
import { clearSession, loadSession, saveSession, type StoredSession } from './session-store';

type AuthStatus = 'loading' | 'signed-out' | 'signed-in';

interface AuthContextValue {
  status: AuthStatus;
  session: StoredSession | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Sign-in refusals the login screen can show. */
export class SignInError extends Error {
  constructor(
    message: string,
    public code: 'invalid' | 'rate_limited' | 'demo_locked' | 'network'
  ) {
    super(message);
    this.name = 'SignInError';
  }
}

interface LoginResponse {
  token: string;
  expiresAt: string;
  user: StoredSession['user'];
}

/**
 * Owns the session: restores it from the keychain on launch, refreshes it
 * on every cold start (sliding 30-day expiry — a client who opens the app
 * even monthly is never signed out), signs in and out, and turns any 401
 * from the API into a sign-out so a dead token can't leave a frozen screen.
 *
 * Also hosts the SWR config, because the "401 means sign out" rule and the
 * React Native focus provider both belong to the session's owner.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [session, setSession] = useState<StoredSession | null>(null);

  const signOut = useCallback(async () => {
    await clearSession();
    setSession(null);
    setStatus('signed-out');
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await loadSession();
      if (cancelled) return;
      if (!stored) {
        setStatus('signed-out');
        return;
      }
      setSession(stored);
      setStatus('signed-in');

      // Refresh in the background. A 401 means the account is gone or the
      // token expired — sign out. Anything else (offline) keeps the stored
      // session; the API will say 401 later if it really is dead.
      try {
        const fresh = await apiFetch<LoginResponse>('/api/auth/mobile/refresh', { method: 'POST' });
        if (cancelled) return;
        await saveSession(fresh);
        setSession(fresh);
      } catch (e) {
        if (!cancelled && e instanceof ApiError && e.status === 401) await signOut();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [signOut]);

  const signIn = useCallback(async (email: string, password: string) => {
    let res: LoginResponse;
    try {
      res = await apiFetch<LoginResponse>('/api/auth/mobile/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 429) throw new SignInError(e.message, 'rate_limited');
        if (e.status === 403) throw new SignInError(e.message, 'demo_locked');
        throw new SignInError('Invalid email or password', 'invalid');
      }
      throw new SignInError("Couldn't reach Logbook. Check your connection and try again.", 'network');
    }
    await saveSession(res);
    setSession(res);
    setStatus('signed-in');
  }, []);

  const value = useMemo(
    () => ({ status, session, signIn, signOut }),
    [status, session, signIn, signOut]
  );

  return (
    <AuthContext.Provider value={value}>
      <SWRConfig
        value={{
          fetcher,
          // SWR's default focus/visibility providers read `document`, which
          // React Native doesn't have — drive revalidation from AppState
          // instead (the native equivalent of the web's visibilitychange fix).
          isVisible: () => true,
          initFocus(callback) {
            let current = AppState.currentState;
            const sub = AppState.addEventListener('change', (next) => {
              if (current.match(/inactive|background/) && next === 'active') callback();
              current = next;
            });
            return () => sub.remove();
          },
          onError(error) {
            if (error instanceof ApiError && error.status === 401) void signOut();
          },
        }}
      >
        {children}
      </SWRConfig>
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

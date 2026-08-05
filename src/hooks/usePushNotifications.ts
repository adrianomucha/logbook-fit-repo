'use client';

import { useCallback, useEffect, useState } from 'react';
import useSWR from 'swr';
import {
  disablePushNotifications,
  enablePushNotifications,
  getExistingSubscription,
  isIosBrowser,
  isPushSupported,
  isStandalone,
} from '@/lib/push-client';

interface PushConfig {
  enabled: boolean;
  publicKey: string | null;
}

export interface PushNotificationsState {
  /** Push is available in this browser AND configured on the server */
  available: boolean;
  /** This device is registered for notifications */
  isSubscribed: boolean;
  /** Browser permission was denied — only the user can undo this, in settings */
  isBlocked: boolean;
  /** iOS in a normal tab: notifications need the app installed first */
  needsInstall: boolean;
  isBusy: boolean;
  /** Still working out support/subscription state — render nothing yet */
  isLoading: boolean;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
  error: string | null;
}

/**
 * Web Push opt-in for the current device.
 *
 * Everything degrades quietly: an unsupported browser, a server without VAPID
 * keys, or a denied permission all resolve to `available: false` (or
 * `isBlocked`) so callers can simply not render the control.
 */
export function usePushNotifications(): PushNotificationsState {
  const { data: config, isLoading: isLoadingConfig } = useSWR<PushConfig>(
    '/api/push/config',
    // The VAPID key doesn't change while the tab is open
    { revalidateOnFocus: false, revalidateIfStale: false }
  );

  const [supported, setSupported] = useState<boolean | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [needsInstall, setNeedsInstall] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const ok = isPushSupported();
    setSupported(ok);
    if (!ok) {
      // iOS Safari in a tab has no PushManager at all — the fix is installing
      // the app, not switching browsers, so say which case this is.
      setNeedsInstall(isIosBrowser() && !isStandalone());
      return;
    }
    setPermission(Notification.permission);
    getExistingSubscription()
      .then((sub) => {
        if (!cancelled) setIsSubscribed(!!sub);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const enable = useCallback(async () => {
    if (!config?.publicKey) return;
    setIsBusy(true);
    setError(null);
    try {
      await enablePushNotifications(config.publicKey);
      setIsSubscribed(true);
      setPermission(Notification.permission);
    } catch (e) {
      setPermission(typeof Notification !== 'undefined' ? Notification.permission : null);
      setError(e instanceof Error ? e.message : 'Couldn’t turn on notifications.');
      throw e;
    } finally {
      setIsBusy(false);
    }
  }, [config?.publicKey]);

  const disable = useCallback(async () => {
    setIsBusy(true);
    setError(null);
    try {
      await disablePushNotifications();
      setIsSubscribed(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t turn off notifications.');
      throw e;
    } finally {
      setIsBusy(false);
    }
  }, []);

  return {
    available: !!supported && !!config?.enabled && !!config.publicKey,
    isSubscribed,
    isBlocked: permission === 'denied',
    needsInstall,
    isBusy,
    isLoading: supported === null || isLoadingConfig,
    enable,
    disable,
    error,
  };
}

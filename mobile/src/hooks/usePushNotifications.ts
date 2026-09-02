import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { disablePush, enablePush, getPushPermission, isPushAvailable, storedPushToken } from '@/lib/push';

export interface PushNotificationsState {
  /** Push can work on this device and build. */
  available: boolean;
  /** This device is registered. */
  isSubscribed: boolean;
  /** Permission was denied — only the person can undo this, in Settings. */
  isBlocked: boolean;
  isBusy: boolean;
  isLoading: boolean;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
}

/** Per-device opt-in for notifications — the web's usePushNotifications, native. */
export function usePushNotifications(): PushNotificationsState {
  const available = isPushAvailable();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!available) {
      setIsLoading(false);
      return;
    }
    const [permission, token] = await Promise.all([getPushPermission(), storedPushToken()]);
    setIsBlocked(permission === 'denied');
    setIsSubscribed(permission === 'granted' && !!token);
    setIsLoading(false);
  }, [available]);

  useEffect(() => {
    void refresh();
    // Coming back from Settings after changing the permission
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  const enable = useCallback(async () => {
    setIsBusy(true);
    try {
      await enablePush();
      await refresh();
    } finally {
      setIsBusy(false);
    }
  }, [refresh]);

  const disable = useCallback(async () => {
    setIsBusy(true);
    try {
      await disablePush();
      await refresh();
    } finally {
      setIsBusy(false);
    }
  }, [refresh]);

  return { available, isSubscribed, isBlocked, isBusy, isLoading, enable, disable };
}

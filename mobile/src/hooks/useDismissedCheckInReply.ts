import { useCallback, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { DISMISSED_CHECK_IN_REPLY_KEY } from '@logbook/shared/checkin-reply';

/**
 * Per-device "put away" flag for the check-in reply on Today. Holds the id of
 * the reply the client dismissed or opened. `ready` stays false until storage
 * has been read, so a dismissed reply never flashes back on load.
 * The web's useDismissedCheckInReply.
 */
export function useDismissedCheckInReply() {
  const [dismissedId, setDismissedId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    SecureStore.getItemAsync(DISMISSED_CHECK_IN_REPLY_KEY)
      .then((id) => {
        if (!cancelled) setDismissedId(id);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const dismiss = useCallback((checkInId: string) => {
    setDismissedId(checkInId);
    // Still hides for this session if the write fails
    SecureStore.setItemAsync(DISMISSED_CHECK_IN_REPLY_KEY, checkInId).catch(() => undefined);
  }, []);

  return { dismissedId, ready, dismiss };
}

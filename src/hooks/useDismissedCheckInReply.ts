import { useCallback, useEffect, useState } from 'react';
import { DISMISSED_CHECK_IN_REPLY_KEY } from '@logbook/shared/checkin-reply';

function storage() {
  return typeof window === 'undefined' ? null : window.localStorage;
}

/**
 * Per-device "put away" flag for the check-in reply on Today. Holds the id of
 * the reply the client dismissed or opened. `ready` stays false until storage
 * has been read, so a dismissed reply never flashes back on load.
 */
export function useDismissedCheckInReply() {
  const [dismissedId, setDismissedId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setDismissedId(storage()?.getItem(DISMISSED_CHECK_IN_REPLY_KEY) ?? null);
    } catch {
      // Storage throws in private/locked-down modes: show the reply.
    }
    setReady(true);
  }, []);

  const dismiss = useCallback((checkInId: string) => {
    try {
      storage()?.setItem(DISMISSED_CHECK_IN_REPLY_KEY, checkInId);
    } catch {
      // Still hides for this page view.
    }
    setDismissedId(checkInId);
  }, []);

  return { dismissedId, ready, dismiss };
}

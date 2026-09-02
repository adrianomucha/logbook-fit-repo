import { useCallback, useEffect, useState } from 'react';
import { readHiddenPending, writeHiddenPending } from '@/lib/pending-checkin-visibility';

function storage() {
  return typeof window === 'undefined' ? null : window.localStorage;
}

/**
 * Per-device "hide until they respond" flag for one pending check-in.
 * Pass null when there's nothing pending; the flag reads as visible.
 * Read in an effect so server and first client render agree.
 */
export function useHiddenPendingCheckIn(checkInId: string | null) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    setHidden(checkInId ? readHiddenPending(storage(), checkInId) : false);
  }, [checkInId]);

  const setHiddenFor = useCallback(
    (next: boolean) => {
      if (!checkInId) return;
      writeHiddenPending(storage(), checkInId, next);
      setHidden(next);
    },
    [checkInId]
  );

  return {
    hidden,
    hide: useCallback(() => setHiddenFor(true), [setHiddenFor]),
    unhide: useCallback(() => setHiddenFor(false), [setHiddenFor]),
  };
}

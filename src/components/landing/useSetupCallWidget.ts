'use client';

import { useCallback, useEffect, useRef } from 'react';
import { getCalApi } from '@calcom/embed-react';
import { setupCallBookingUrl } from '@/lib/setup-call';
import type { SetupCallBooking } from '@/components/landing/SetupCallBooked';

const NAMESPACE = 'setup-call';
const EMBED_JS = 'https://app.cal.com/embed/embed.js';

type CalApi = Awaited<ReturnType<typeof getCalApi>>;

/**
 * Cal.com's booking popup for the setup call. Its script loads only once
 * `enabled` turns true (the booking step is on screen), so the landing page
 * pays nothing for it up front.
 *
 * Returns the function that opens the popup, with the coach's email filled
 * in. If the script hasn't loaded (blocked, or still on its way), it opens
 * the booking page in a new tab instead: the booking still sends the invite
 * through the webhook, the card just can't follow along.
 *
 * getCalApi resolves straight away with a queue that only runs once Cal's
 * script arrives, so "loaded" is tracked from the script element itself:
 * a queued popup behind a blocked script would be a dead button.
 */
export function useSetupCallWidget({
  link,
  email,
  enabled,
  onBooked,
}: {
  link: string | null;
  email: string;
  enabled: boolean;
  onBooked: (booking: SetupCallBooking) => void;
}): () => void {
  const calRef = useRef<CalApi | null>(null);
  const loadedRef = useRef(false);
  const onBookedRef = useRef(onBooked);
  onBookedRef.current = onBooked;

  useEffect(() => {
    if (!enabled || !link || calRef.current) return;
    let cancelled = false;
    getCalApi({ namespace: NAMESPACE })
      .then((cal) => {
        if (cancelled || calRef.current) return;
        calRef.current = cal;
        const script = document.querySelector<HTMLScriptElement>(`script[src="${EMBED_JS}"]`);
        script?.addEventListener('load', () => {
          loadedRef.current = true;
        });
        cal('on', {
          action: 'bookingSuccessfulV2',
          callback: (e) => {
            const { startTime } = e.detail.data;
            if (startTime) onBookedRef.current({ startTime });
          },
        });
      })
      .catch(() => {
        // Script blocked or offline: openBooking falls back to a new tab
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, link]);

  return useCallback(() => {
    if (!link) return;
    const cal = calRef.current;
    if (cal && loadedRef.current) {
      cal('modal', { calLink: link, config: { email, layout: 'month_view' } });
    } else {
      window.open(setupCallBookingUrl(link, email), '_blank', 'noopener');
    }
  }, [link, email]);
}

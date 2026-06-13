'use client';

import { Analytics, type BeforeSendEvent } from '@vercel/analytics/next';

/**
 * Vercel Web Analytics with a per-device opt-out.
 * To exclude a browser, run once on the production domain:
 *   localStorage.setItem('va-disable', '1')
 * Client wrapper because beforeSend is a function prop, which the
 * server-component root layout can't pass down directly.
 */
export function AnalyticsWithOptOut() {
  return (
    <Analytics
      beforeSend={(event: BeforeSendEvent) => {
        if (localStorage.getItem('va-disable')) {
          return null;
        }
        return event;
      }}
    />
  );
}

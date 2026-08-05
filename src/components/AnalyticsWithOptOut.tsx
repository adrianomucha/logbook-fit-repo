'use client';

import { Analytics, type BeforeSendEvent } from '@vercel/analytics/next';
import { useEffect } from 'react';
import {
  applyOptOutParamOnce,
  clearOptOutParamFromUrl,
  isOptedOut,
} from '@/lib/analytics-opt-out';

/**
 * Vercel Web Analytics, minus the visits we make ourselves.
 *
 * Load `https://logbook.fit/?va-disable=1` once in a browser to stop counting
 * it, `?va-disable=0` to count it again. Per origin and per browser, so it has
 * to be done on each device you browse from. See `@/lib/analytics-opt-out`.
 *
 * Client component because `beforeSend` is a function prop, and the
 * server-component root layout can't pass a function across that boundary.
 */
export function AnalyticsWithOptOut() {
  // During render rather than in an effect on purpose: <Analytics> starts
  // fetching the insights script as soon as it mounts, and beforeSend reads
  // storage at the moment an event goes out. Writing the flag before the child
  // below mounts is what stops a first pageview escaping ahead of
  // ?va-disable=1. Idempotent — it no-ops after the first call.
  const intent = applyOptOutParamOnce();

  useEffect(() => {
    if (!intent) return;
    // Left to an effect because it touches history, which the App Router
    // watches; rewriting the URL mid-render would update the router while
    // React is still rendering. Nothing above depends on it having run.
    clearOptOutParamFromUrl();
    console.info(
      intent === 'opt-out'
        ? '[analytics] This browser is no longer counted. Load ?va-disable=0 to undo.'
        : '[analytics] This browser is counted again.'
    );
  }, [intent]);

  return (
    <Analytics beforeSend={(event: BeforeSendEvent) => (isOptedOut() ? null : event)} />
  );
}

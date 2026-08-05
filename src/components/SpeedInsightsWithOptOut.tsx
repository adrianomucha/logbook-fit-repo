'use client';

import { SpeedInsights } from '@vercel/speed-insights/next';
import { applyOptOutParamOnce, isOptedOut } from '@/lib/analytics-opt-out';

/**
 * Vercel Speed Insights honoring the same per-browser opt-out as Web
 * Analytics, so an excluded device skews neither audience counts nor Web
 * Vitals (see `@/lib/analytics-opt-out` for the flag and the URL toggle).
 *
 * Applies the URL toggle itself rather than trusting the order these two sit
 * in the root layout: whichever renders first writes the flag, and the other
 * call is a no-op.
 *
 * Client component because `beforeSend` is a function prop, and the
 * server-component root layout can't pass a function across that boundary.
 */
export function SpeedInsightsWithOptOut() {
  applyOptOutParamOnce();

  return <SpeedInsights beforeSend={(event) => (isOptedOut() ? null : event)} />;
}

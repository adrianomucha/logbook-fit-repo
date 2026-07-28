'use client';

import { SpeedInsights } from '@vercel/speed-insights/next';

/**
 * Vercel Speed Insights honoring the same per-device opt-out as Web
 * Analytics, so an excluded browser skews neither audience nor Web
 * Vitals data (see AnalyticsWithOptOut for the localStorage flag).
 * Client wrapper because beforeSend is a function prop, which the
 * server-component root layout can't pass down directly.
 */
export function SpeedInsightsWithOptOut() {
  return (
    <SpeedInsights
      beforeSend={(event) => {
        if (localStorage.getItem('va-disable')) {
          return null;
        }
        return event;
      }}
    />
  );
}

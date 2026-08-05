/**
 * Keeping our own visits out of Vercel Web Analytics.
 *
 * Web Analytics has no server-side exclusion — no IP filter, no "don't count
 * me" switch in the dashboard. The only hook is `beforeSend`, which runs in
 * the browser on every event: return the event to send it, return null to drop
 * it. So an opt-out is necessarily a per-browser flag, and this module is that
 * flag — a `va-disable` key in localStorage that both `AnalyticsWithOptOut`
 * and `SpeedInsightsWithOptOut` check before letting an event out.
 *
 * Setting the key by hand works, but means opening a console on every device.
 * The `?va-disable=1` / `?va-disable=0` parameter handled here is the same
 * switch as a link, which is the only version of it that's usable on a phone.
 *
 * Scope is per origin and per browser profile: opting out on logbook.fit does
 * nothing for a preview deployment, another browser, or a private window
 * (whose storage is discarded on close). Localhost is already uncounted either
 * way — `/_vercel/insights/` only exists on Vercel deployments, so the script
 * 404s and no events are generated.
 *
 * The pure half is split out so it can be tested under the `node` test
 * environment; the React side lives in `@/components/AnalyticsWithOptOut`.
 */

export const ANALYTICS_OPT_OUT_KEY = 'va-disable';

/** What a `?va-disable=` parameter asked for, if it was present at all. */
export type OptOutIntent = 'opt-out' | 'opt-in' | null;

/** Pure: reads the toggle out of a query string (`location.search`). */
export function readOptOutIntent(search: string): OptOutIntent {
  // URLSearchParams parses leniently rather than throwing, so a malformed
  // query string reads as "no opinion" and leaves the stored flag as it was.
  const value = new URLSearchParams(search).get(ANALYTICS_OPT_OUT_KEY);
  if (value === '1') return 'opt-out';
  if (value === '0') return 'opt-in';
  return null;
}

/**
 * Pure: `href` minus the toggle, as a same-document URL.
 *
 * The parameter is stripped once it has been applied so it can't ride along
 * into a bookmark or a shared link — otherwise one copied URL silently stops
 * counting whoever it gets sent to.
 */
export function stripOptOutParam(href: string): string {
  const url = new URL(href);
  url.searchParams.delete(ANALYTICS_OPT_OUT_KEY);
  return url.pathname + url.search + url.hash;
}

/**
 * True when this browser has opted out.
 *
 * Presence of the key is the whole rule, so a hand-set `va-disable=anything`
 * still counts as opted out. Storage access throws outright in some privacy
 * modes rather than returning null, and the fallback there is to count the
 * visit: a stray pageview beats an exception thrown mid-render.
 */
export function isOptedOut(): boolean {
  try {
    return localStorage.getItem(ANALYTICS_OPT_OUT_KEY) !== null;
  } catch {
    return false;
  }
}

function writeOptOut(optedOut: boolean): void {
  try {
    if (optedOut) {
      localStorage.setItem(ANALYTICS_OPT_OUT_KEY, '1');
    } else {
      localStorage.removeItem(ANALYTICS_OPT_OUT_KEY);
    }
  } catch {
    // Storage unavailable. Nothing to do — isOptedOut() reads false anyway,
    // and this browser simply stays counted.
  }
}

/** Memoized so two callers (Analytics and Speed Insights) do the work once. */
let applied: OptOutIntent | undefined;

/**
 * Applies `?va-disable=` to storage, at most once per page load, and reports
 * what it did so the caller can tidy the URL and say so in the console.
 *
 * Safe to call from any component's render pass: it is idempotent, and on the
 * server-rendered pass it does nothing at all.
 */
export function applyOptOutParamOnce(): OptOutIntent {
  if (typeof window === 'undefined') return null;
  if (applied === undefined) {
    applied = readOptOutIntent(window.location.search);
    if (applied) writeOptOut(applied === 'opt-out');
  }
  return applied;
}

/** Drops the toggle from the address bar, leaving the page where it is. */
export function clearOptOutParamFromUrl(): void {
  window.history.replaceState(null, '', stripOptOutParam(window.location.href));
}

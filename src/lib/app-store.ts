/**
 * The client app's App Store page, once it is live. Set
 * NEXT_PUBLIC_APP_STORE_URL to turn on every place that points at it: the
 * public pages (src/lib/offer.ts) and the client's install banner. Anything
 * that is not an https://apps.apple.com address is ignored, so a typo cannot
 * put a bad link in front of people.
 *
 * NEXT_PUBLIC_ so the banner, which runs in the browser, can read it too.
 */
export function appStoreUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_APP_STORE_URL?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' && url.hostname === 'apps.apple.com' ? url.toString() : null;
  } catch {
    return null;
  }
}

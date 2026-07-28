/**
 * Canonical site identity. Every absolute URL the crawlers see — canonical
 * tags, Open Graph images, robots.txt, the sitemap, JSON-LD @id — is derived
 * from SITE_URL, so a preview deploy never leaks its own hostname into
 * production metadata (and production never claims a preview URL).
 *
 * Set NEXT_PUBLIC_SITE_URL in the environment to override.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://logbook.fit'
).replace(/\/+$/, '');

export const SITE_NAME = 'Logbook.fit';

/**
 * Keyword-first so the SERP result leads with what the product *is* rather
 * than a brand nobody searches for yet. 52 chars — under Google's ~60 char
 * desktop truncation point.
 */
export const SITE_TITLE = 'Coaching software for personal trainers · Logbook.fit';

/** ~150 chars — long enough to earn the click, short enough to survive truncation. */
export const SITE_DESCRIPTION =
  'Coaching software for personal trainers: build multi-week workout plans, track client progress, and close the loop with structured check-ins.';

/** Absolute URL helper for metadata that can't use metadataBase (JSON-LD, sitemap). */
export function absoluteUrl(path = '/'): string {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

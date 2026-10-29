import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/seo';

/**
 * Serves /robots.txt.
 *
 * Only the public landing page is meant to be crawled. Everything behind auth
 * (/coach, /client, /admin) and every API route is disallowed — those pages
 * would 302 to /login for a crawler anyway, so letting bots walk them just
 * burns crawl budget and risks thin, duplicate "Sign in" pages entering the
 * index.
 *
 * /login, /signup, /forgot-password and /reset-password are deliberately NOT
 * disallowed. Each carries a noindex meta tag, and a crawler can only obey
 * noindex on a page it is allowed to fetch. Blocking them here hid that tag:
 * the landing page links to /login, so Google could index the bare URL as a
 * contentless "No information is available for this page" result.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/coach/',
          '/client/',
        ],
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
    host: absoluteUrl('/').replace(/\/$/, ''),
  };
}

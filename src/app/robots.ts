import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/seo';

/**
 * Serves /robots.txt.
 *
 * Only the public landing page is meant to be crawled. Everything behind auth
 * (/coach, /client, /admin) and every API route is disallowed — those pages
 * would 302 to /login for a crawler anyway, so letting bots walk them just
 * burns crawl budget and risks thin, duplicate "Sign in" pages entering the
 * index. /signup is disallowed because invite links are unguessable one-time
 * tokens that should never be indexed.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/', '/coach/', '/client/', '/login', '/signup'],
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
    host: absoluteUrl('/').replace(/\/$/, ''),
  };
}

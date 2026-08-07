import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/seo';

/**
 * Serves /sitemap.xml.
 *
 * Only public, indexable URLs belong here. Add marketing/content routes as
 * they ship — a sitemap that lists auth-walled routes is worse than no
 * sitemap at all.
 *
 * lastModified is set by hand when a page's content actually changes.
 * `new Date()` here would stamp every entry with the build time, claiming
 * everything changed on every deploy — crawlers learn to distrust the field
 * and then ignore it when a page really does change.
 */

// Bump when the landing page's content changes meaningfully.
const LANDING_UPDATED = new Date('2026-08-07');
// Matches the "updated" date shown on the legal pages themselves.
const LEGAL_UPDATED = new Date('2026-08-06');

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: absoluteUrl('/'),
      lastModified: LANDING_UPDATED,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: absoluteUrl('/legal'),
      lastModified: LEGAL_UPDATED,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: absoluteUrl('/privacy'),
      lastModified: LEGAL_UPDATED,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: absoluteUrl('/terms'),
      lastModified: LEGAL_UPDATED,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];
}

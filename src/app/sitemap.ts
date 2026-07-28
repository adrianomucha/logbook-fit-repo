import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/seo';

/**
 * Serves /sitemap.xml.
 *
 * One entry while the product is pre-launch: the waitlist landing page is the
 * only public, indexable URL. Add marketing/content routes here as they ship —
 * a sitemap that lists auth-walled routes is worse than no sitemap at all.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: absoluteUrl('/'),
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
  ];
}

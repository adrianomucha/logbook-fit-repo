import type { MetadataRoute } from 'next';
import { SITE_DESCRIPTION } from '@/lib/seo';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Logbook Fitness',
    short_name: 'Logbook',
    // Same copy as the meta description — Android's install prompt and the
    // "add to home screen" sheet surface this, so a third variant of the
    // product's one-liner would only dilute it.
    description: SITE_DESCRIPTION,
    start_url: '/',
    id: '/',
    scope: '/',
    lang: 'en-US',
    categories: ['fitness', 'health', 'productivity', 'sports'],
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}

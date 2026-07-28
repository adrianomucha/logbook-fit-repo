import type { Metadata } from 'next';

/**
 * The login page is a client component, so it can't export metadata itself —
 * this layout carries it. robots.txt already asks crawlers not to fetch
 * /login, but a Disallow only stops the *crawl*: Google will still index a
 * URL it has never fetched if enough external links point at it, showing a
 * blank result. noindex is the directive that actually keeps it out.
 */
export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to your Logbook.fit coaching account.',
  robots: { index: false, follow: false, nocache: true },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}

import type { Metadata } from 'next';

/**
 * The login page is a client component, so it can't export metadata itself —
 * this layout carries it. noindex is what keeps /login out of the index, so
 * robots.txt must NOT disallow it: a crawler that can't fetch the page never
 * sees the tag, and can still index the bare URL from links to it.
 */
export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to your Logbook.fit coaching account.',
  robots: { index: false, follow: false, nocache: true },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}

import type { Metadata } from 'next';

/**
 * The forgot-password page is a client component, so it can't export metadata
 * itself — this layout carries it. Same reasoning as /login: robots.txt asks
 * crawlers not to fetch it, but only noindex actually keeps the URL out of
 * the index if external links ever point at it.
 */
export const metadata: Metadata = {
  title: 'Forgot password',
  robots: { index: false, follow: false, nocache: true },
};

export default function ForgotPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

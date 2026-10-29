import type { Metadata } from 'next';

/**
 * The forgot-password page is a client component, so it can't export metadata
 * itself, so this layout carries it. Same reasoning as /login: noindex keeps
 * it out of the index, and robots.txt leaves it crawlable so the tag is seen.
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

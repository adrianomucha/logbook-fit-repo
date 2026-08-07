import type { Metadata } from 'next';

/**
 * Reset links carry one-time tokens in the query string and must never reach
 * an index — same posture as /signup. The page is a client component, so this
 * layout carries the metadata.
 */
export const metadata: Metadata = {
  title: 'Reset password',
  robots: { index: false, follow: false, nocache: true },
};

export default function ResetPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

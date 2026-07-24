import type { Metadata } from 'next';

/**
 * Invite links carry one-time tokens in the query string and must never reach
 * an index. The page's own generateMetadata still supplies the title,
 * description and unfurl card — link previews in iMessage/WhatsApp are the
 * whole point of that route — because noindex governs search engines, not the
 * unfurlers.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}

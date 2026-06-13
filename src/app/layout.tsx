import type { Metadata } from 'next';
import { AnalyticsWithOptOut } from '@/components/AnalyticsWithOptOut';
import { IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google';
import { SessionProvider } from '@/providers/SessionProvider';
import { SWRProvider } from '@/providers/SWRProvider';
import { ScrollToTop } from '@/components/ScrollToTop';
import '@/app/globals.css';

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex-mono',
  display: 'swap',
});

// Proportional sibling of Plex Mono — used for conversational/long-form text
// (chat, check-in prose) so the human parts read warmer than the mono UI chrome.
const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'LogBook.fit',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${ibmPlexMono.variable} ${ibmPlexSans.variable}`}>
      <body>
        <SessionProvider>
          <SWRProvider>
              <ScrollToTop />
              {children}
          </SWRProvider>
        </SessionProvider>
        <AnalyticsWithOptOut />
      </body>
    </html>
  );
}

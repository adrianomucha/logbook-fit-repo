import type { Metadata, Viewport } from 'next';
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

// viewport-fit=cover so env(safe-area-inset-*) resolves on notched iPhones,
// especially in standalone (home-screen) mode.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'LogBook.fit',
  appleWebApp: {
    capable: true,
    title: 'Logbook',
    statusBarStyle: 'default',
  },
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

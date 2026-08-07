import type { Metadata, Viewport } from 'next';
import { AnalyticsWithOptOut } from '@/components/AnalyticsWithOptOut';
import { SpeedInsightsWithOptOut } from '@/components/SpeedInsightsWithOptOut';
import { IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google';
import { SessionProvider } from '@/providers/SessionProvider';
import { SWRProvider } from '@/providers/SWRProvider';
import { ScrollToTop } from '@/components/ScrollToTop';
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL } from '@/lib/seo';
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
  // Resolves every relative URL below (and in child routes) to an absolute one.
  // Without it Next.js can't emit og:image/canonical URLs at all — crawlers and
  // unfurlers require absolute URLs and silently drop relative ones.
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    // Child routes set a bare title ("Waitlist · Admin") and inherit the brand
    // suffix, instead of every page in the app rendering as just "LogBook.fit".
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  // No `alternates` here on purpose: metadata inherits per top-level key, so
  // a canonical declared in the root layout leaks onto every child route that
  // doesn't override it — /privacy et al. were claiming to be duplicates of
  // the homepage. Each indexable page declares its own canonical (the home
  // page in page.tsx, the rest via pageMetadata()).
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    locale: 'en_US',
    url: '/',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      // Lets Google use full-size image previews and untruncated snippets —
      // both default to conservative limits when unspecified.
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  // Stops iOS Safari from auto-linking numbers in copy (e.g. "01", "1200")
  // as phone numbers, which injects unwanted <a> tags into the crawled DOM.
  formatDetection: { telephone: false, address: false, email: false },
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
        <SpeedInsightsWithOptOut />
      </body>
    </html>
  );
}

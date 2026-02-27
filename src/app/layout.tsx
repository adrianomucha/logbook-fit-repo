import type { Metadata } from 'next';
import { IBM_Plex_Mono } from 'next/font/google';
import { SessionProvider } from '@/providers/SessionProvider';
import { SWRProvider } from '@/providers/SWRProvider';
import { LogoutButton } from '@/components/LogoutButton';
import '@/app/globals.css';

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'LogBook.fit',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={ibmPlexMono.variable}>
      <body>
        <SessionProvider>
          <SWRProvider>
              {children}
              <LogoutButton />
          </SWRProvider>
        </SessionProvider>
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import { JetBrains_Mono } from 'next/font/google';
import { AppStateProvider } from '@/providers/AppStateProvider';
import { SwitchRoleButton } from '@/components/SwitchRoleButton';
import '@/app/globals.css';

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'LogBook.fit',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={jetbrainsMono.variable}>
      <body>
        <AppStateProvider>
          {children}
          <SwitchRoleButton />
        </AppStateProvider>
      </body>
    </html>
  );
}

'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Toaster } from 'sonner';

/**
 * Client layout — wraps all /client/* pages.
 * Provides safe bottom padding for the mobile bottom nav
 * that individual views render via ClientNav.
 */
export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Scroll to top on every page navigation.
  // The immediate call handles normal cases; the rAF call
  // beats browser scroll-restoration on real devices.
  useEffect(() => {
    window.scrollTo(0, 0);
    requestAnimationFrame(() => window.scrollTo(0, 0));
  }, [pathname]);

  return (
    <div className="min-h-screen bg-background pb-20 sm:pb-0">
      {children}
      <Toaster position="top-center" richColors closeButton />
    </div>
  );
}

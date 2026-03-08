'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Coach layout — wraps all /coach/* pages.
 * Provides safe bottom padding for the mobile bottom nav
 * that individual views render via CoachNav.
 */
export default function CoachLayout({ children }: { children: React.ReactNode }) {
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
    </div>
  );
}

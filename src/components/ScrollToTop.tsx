'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Scrolls the window to the top on every route change.
 * Drop this once into the root layout and forget about it.
 */
export function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    window.scrollTo(0, 0);
    requestAnimationFrame(() => window.scrollTo(0, 0));
  }, [pathname]);

  return null;
}

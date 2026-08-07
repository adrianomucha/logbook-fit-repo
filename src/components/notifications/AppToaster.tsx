'use client';

import { Toaster } from 'sonner';

/**
 * The app's one toast surface, shared by the coach and client layouts.
 *
 * Anchored bottom-trailing rather than top-center: the top of every screen is
 * occupied by the sticky header, so a top-center toast landed on the nav and
 * covered it. Down here the notice floats clear of both the header and the
 * page's reading column.
 *
 * On mobile sonner goes full-width at the bottom, where the fixed tab bar
 * lives — so the mobile offset clears the bar (and the home indicator) using
 * the same --tabbar-h the layouts derive their padding from.
 */
export function AppToaster() {
  return (
    <Toaster
      position="bottom-right"
      richColors
      closeButton
      offset={{ bottom: '24px', right: '24px' }}
      mobileOffset={{
        bottom: 'calc(var(--tabbar-h) + env(safe-area-inset-bottom) + 0.75rem)',
        left: '0.75rem',
        right: '0.75rem',
      }}
      toastOptions={{ classNames: { toast: 'font-sans' } }}
    />
  );
}

'use client';

import { useEffect, useRef } from 'react';

/**
 * Scroll reveals for the landing page. Anything inside marked `data-reveal`
 * fades up the first time it scrolls into view; `--reveal-delay` on the
 * element staggers it against its neighbours.
 *
 * The page is rendered fully visible. Only once this has mounted does it hide
 * what is still below the fold (the styles live in globals.css, keyed on
 * `data-reveal-ready`), so a visitor without JavaScript, a crawler, or anyone
 * who asked for reduced motion gets the whole page with nothing held back.
 */
export function RevealScope({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scope = ref.current;
    if (!scope || !('IntersectionObserver' in window)) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const targets = Array.from(scope.querySelectorAll<HTMLElement>('[data-reveal]'));
    // Whatever is already on screen (or above it, after a scroll restore)
    // stays exactly as it was painted: no flash, no replayed entrance.
    const pending = targets.filter((el) => {
      if (el.getBoundingClientRect().top >= window.innerHeight) return true;
      el.dataset.revealed = '';
      return false;
    });
    scope.dataset.revealReady = '';

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).dataset.revealed = '';
          observer.unobserve(entry.target);
        }
      },
      // Wait until an element is a little way in, so the motion happens
      // where the eye already is and not at the very edge of the screen.
      { rootMargin: '0px 0px -12% 0px' }
    );
    pending.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
      delete scope.dataset.revealReady;
    };
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

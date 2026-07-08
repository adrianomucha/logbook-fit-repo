'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  /** Entrance delay in ms — used to stagger siblings. */
  delay?: number;
  /** Render element. Defaults to a div. */
  as?: 'div' | 'li' | 'section';
}

type Phase = 'idle' | 'hidden' | 'shown';

/**
 * Fade-in-up on scroll, matching the app's entrance vocabulary
 * (translateY 8px, cubic-bezier(0.25,1,0.5,1)).
 *
 * Robust by design: the server-rendered / pre-hydration / no-JS state is
 * fully VISIBLE, so content is never stuck hidden for crawlers or users
 * without JavaScript. Only after hydration do below-the-fold elements get
 * hidden and then revealed on scroll — that transition happens off-screen,
 * so there's no flash. Elements already in view (e.g. the hero) simply stay
 * visible. Honors prefers-reduced-motion.
 */
export function Reveal({ children, className, delay = 0, as = 'div' }: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced || typeof IntersectionObserver === 'undefined') {
      setPhase('shown');
      return;
    }

    // Already in (or above) the viewport → keep visible, no hide, no flash.
    if (el.getBoundingClientRect().top < window.innerHeight) {
      setPhase('shown');
      return;
    }

    // Strictly below the fold → hide off-screen, then reveal on scroll-in.
    setPhase('hidden');
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setPhase('shown');
            observer.disconnect();
            break;
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const Tag = as as 'div';

  return (
    <Tag
      ref={ref as React.Ref<HTMLDivElement>}
      style={phase === 'shown' ? { transitionDelay: `${delay}ms` } : undefined}
      className={cn(
        phase !== 'idle' &&
          'transition-[opacity,transform] duration-[600ms] [transition-timing-function:cubic-bezier(0.25,1,0.5,1)] motion-reduce:transition-none',
        phase === 'hidden' ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0',
        className
      )}
    >
      {children}
    </Tag>
  );
}

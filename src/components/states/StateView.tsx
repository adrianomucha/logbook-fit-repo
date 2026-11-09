import type { ReactNode } from 'react';
import type { StateArtId } from '@logbook/shared/state-art';
import { cn } from '@/lib/utils';
import { StateArt } from './StateArt';

/**
 * The one layout for every empty, caught-up, error and not-found state:
 * a looping isometric illustration, an optional mono kicker, a two-tone
 * headline (what's true in ink, what to do about it in grey), a short
 * body, then actions. The native app's EmptyState has the same anatomy.
 */
export function StateView({
  art,
  kicker,
  tone = 'brand',
  title,
  tail,
  body,
  children,
  size = 'md',
  as: Heading = 'h2',
  className,
}: {
  art: StateArtId;
  /** Mono eyebrow above the headline, e.g. "Plan library · 0 plans" */
  kicker?: string;
  /** Kicker dot: volt for empty, pulsing amber when something broke */
  tone?: 'brand' | 'warning';
  title: ReactNode;
  /** Second line of the headline, in grey */
  tail?: ReactNode;
  body?: ReactNode;
  /** Actions */
  children?: ReactNode;
  /** sm for panels, drawers and modals; md for a whole screen */
  size?: 'sm' | 'md';
  as?: 'h1' | 'h2' | 'h3';
  className?: string;
}) {
  const small = size === 'sm';
  return (
    <div
      className={cn(
        'animate-enter flex flex-col items-center text-center px-4',
        small ? 'py-6' : 'pt-4 pb-8 sm:pt-8',
        className,
      )}
    >
      <StateArt art={art} size={small ? 'sm' : 'md'} className={small ? 'mb-3' : 'mb-5'} />
      {kicker && (
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-2.5 antialiased flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className={cn(
              'w-1.5 h-1.5 rounded-full',
              tone === 'warning' ? 'bg-warning motion-safe:animate-pulse' : 'bg-brand',
            )}
          />
          {kicker}
        </p>
      )}
      <Heading
        className={cn(
          'font-semibold tracking-tight text-balance antialiased max-w-[340px]',
          small ? 'text-base leading-snug' : 'text-xl sm:text-[22px] leading-tight',
        )}
      >
        {title}
        {tail && <span className="block text-muted-foreground">{tail}</span>}
      </Heading>
      {body && (
        <p
          className={cn(
            'text-muted-foreground text-pretty antialiased max-w-[320px]',
            small ? 'text-[13px] mt-1.5' : 'text-sm mt-2.5',
          )}
        >
          {body}
        </p>
      )}
      {children && (
        <div className={cn('flex flex-col sm:flex-row items-center justify-center gap-2.5', small ? 'mt-4' : 'mt-6')}>
          {children}
        </div>
      )}
    </div>
  );
}

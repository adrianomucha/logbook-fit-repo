import type { ReactNode } from 'react';
import type { StateArtId } from '@logbook/shared/state-art';
import { cn } from '@/lib/utils';
import { StateArt } from './StateArt';

/**
 * The one layout for every empty, error and not-found state: a looping
 * isometric illustration, a two-tone headline (what's true in ink, what
 * happens next in grey), at most one short line under it, then actions.
 * Nothing else, so the screen reads as one object. The native app's
 * EmptyState has the same anatomy.
 */
export function StateView({
  art,
  title,
  tail,
  body,
  children,
  size = 'md',
  fill = false,
  as: Heading = 'h2',
  className,
}: {
  art: StateArtId;
  title: ReactNode;
  /** Second line of the headline, in grey */
  tail?: ReactNode;
  /** One short line under the headline */
  body?: ReactNode;
  /** Actions */
  children?: ReactNode;
  /** sm for panels, drawers and modals; md for a whole screen */
  size?: 'sm' | 'md';
  /**
   * The state is the page's content: center it in the height left below the
   * page title (and above the mobile tab bar) instead of hugging the top.
   */
  fill?: boolean;
  as?: 'h1' | 'h2' | 'h3';
  className?: string;
}) {
  const small = size === 'sm';
  return (
    <div
      className={cn(
        'animate-enter flex flex-col items-center justify-center text-center px-4',
        small ? 'py-6' : 'py-8',
        fill && 'min-h-[calc(100dvh-16rem)] sm:min-h-[calc(100dvh-14rem)]',
        className,
      )}
    >
      <StateArt art={art} size={small ? 'sm' : 'md'} className={small ? 'mb-3' : 'mb-5'} />
      <Heading
        className={cn(
          'font-semibold tracking-tight text-balance antialiased',
          small ? 'text-base leading-snug' : 'text-xl sm:text-[22px] leading-tight',
        )}
      >
        {title}
        {tail && <span className="block text-muted-foreground">{tail}</span>}
      </Heading>
      {body && (
        <p className={cn('text-muted-foreground text-pretty antialiased', small ? 'text-[13px] mt-1.5' : 'text-sm mt-2')}>
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

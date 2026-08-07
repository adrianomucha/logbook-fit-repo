'use client';

import Link from 'next/link';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { avatarColor } from '@/lib/avatar-colors';
import { ChevronIcon } from '@/components/coach/shared/clientSignals';

interface MessageToastProps {
  /** Sonner's id for this toast, so the controls can close it */
  toastId: string | number;
  name: string;
  preview: string;
  /** Where the conversation lives */
  href: string;
}

/**
 * Arrival notice for a new message, in the app's card language.
 *
 * Rendered through `toast.custom`, which skips sonner's default surface and
 * its detached corner close button — both replaced here so the notice reads
 * as one deliberate card.
 *
 * The whole card is the link: opening the conversation is the only thing this
 * notice is for, so a separate action button just duplicated it. A real
 * <Link> (not an onClick handler) keeps modifier- and middle-click working,
 * and the trailing chevron is the same "this navigates" cue the client rows
 * use. Dismiss is a sibling rather than a child — a button inside a link is
 * invalid nesting — positioned over the card's top corner.
 */
export function MessageToast({ toastId, name, preview, href }: MessageToastProps) {
  return (
    <div
      className={cn(
        'relative w-full sm:w-[380px] bg-card rounded-xl',
        // Floating surface: more elevation than the flat page cards, with a
        // hairline ring in the shadow stack rather than a border
        'shadow-[0_1px_2px_rgba(0,0,0,0.06),0_8px_24px_-6px_rgba(0,0,0,0.14),0_0_0_1px_rgba(0,0,0,0.06)]',
        'dark:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_8px_24px_-6px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.08)]'
      )}
    >
      <Link
        href={href}
        // Deferred: dismissing synchronously unmounts this link while Next is
        // still starting the client-side transition, which cancels it — the
        // toast would close without ever navigating.
        onClick={() => setTimeout(() => toast.dismiss(toastId), 0)}
        className={cn(
          'flex items-center gap-3 rounded-xl p-3.5 pe-2',
          'hover:bg-muted/50 active:bg-muted/70',
          'transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
        )}
      >
        <div
          className={cn(
            'w-9 h-9 rounded-full flex items-center justify-center shrink-0',
            'text-xs font-bold select-none',
            avatarColor(name)
          )}
          aria-hidden="true"
        >
          {name.charAt(0).toUpperCase()}
        </div>

        {/* pe-6 keeps the eyebrow clear of the dismiss control above it */}
        <div className="flex-1 min-w-0 pe-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium leading-none">
            New message
          </p>
          <p className="text-sm font-bold tracking-tight truncate mt-1.5">{name}</p>
          {/* Two lines is enough to judge urgency; the rest is one click away */}
          <p className="text-[13px] leading-relaxed text-foreground/80 line-clamp-2 text-pretty mt-0.5">
            {preview}
          </p>
        </div>

        <div className="shrink-0 self-center">
          <ChevronIcon />
        </div>
      </Link>

      {/* Sibling of the link, not a child: a button inside an anchor is
          invalid nesting and swallows the link's activation.
          The wrapper carries the placement because `tap-target` sets
          position: relative and would override `absolute` on the button. */}
      <div className="absolute top-2 end-2">
        <button
          type="button"
          onClick={() => toast.dismiss(toastId)}
          aria-label={`Dismiss message from ${name}`}
          className={cn(
            'flex p-1 rounded-md tap-target',
            'text-muted-foreground/70 hover:text-foreground hover:bg-muted',
            'transition-colors duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
          )}
        >
          <X className="w-3.5 h-3.5" strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

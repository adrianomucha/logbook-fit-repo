'use client';

import { toast } from 'sonner';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { avatarColor } from '@/lib/avatar-colors';

interface MessageToastProps {
  /** Sonner's id for this toast, so the dismiss control can close it */
  toastId: string | number;
  name: string;
  preview: string;
  onOpen: () => void;
}

/**
 * Arrival notice for a new message, in the app's card language.
 *
 * Rendered through `toast.custom`, which skips sonner's default surface and
 * its detached corner close button — both replaced here so the notice reads
 * as one deliberate card: identity first, the message itself, then the way in.
 */
export function MessageToast({ toastId, name, preview, onOpen }: MessageToastProps) {
  const initial = name.charAt(0).toUpperCase();

  return (
    <div
      className={cn(
        'w-full sm:w-[380px] bg-card rounded-xl p-3.5',
        // Floating surface: more elevation than the flat page cards, with a
        // hairline ring in the shadow stack rather than a border
        'shadow-[0_1px_2px_rgba(0,0,0,0.06),0_8px_24px_-6px_rgba(0,0,0,0.14),0_0_0_1px_rgba(0,0,0,0.06)]',
        'dark:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_8px_24px_-6px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.08)]'
      )}
    >
      <div className="flex gap-3">
        <div
          className={cn(
            'w-9 h-9 rounded-full flex items-center justify-center shrink-0',
            'text-xs font-bold select-none',
            avatarColor(name)
          )}
          aria-hidden="true"
        >
          {initial}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium leading-none">
                New message
              </p>
              <p className="text-sm font-bold tracking-tight truncate mt-1.5">{name}</p>
            </div>

            {/* Dismiss lives inside the card, not floating off its corner */}
            <button
              type="button"
              onClick={() => toast.dismiss(toastId)}
              aria-label={`Dismiss message from ${name}`}
              className={cn(
                'shrink-0 -mt-1 -mr-1 p-1 rounded-md tap-target',
                'text-muted-foreground hover:text-foreground hover:bg-muted',
                'transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
              )}
            >
              <X className="w-3.5 h-3.5" strokeWidth={2} aria-hidden="true" />
            </button>
          </div>

          {/* Two lines is enough to judge urgency; the rest is one click away */}
          <p className="text-[13px] leading-relaxed text-foreground/80 line-clamp-2 text-pretty mt-1">
            {preview}
          </p>

          <div className="flex justify-end mt-2.5">
            <button
              type="button"
              onClick={() => {
                toast.dismiss(toastId);
                onOpen();
              }}
              className={cn(
                'h-8 px-3.5 rounded-lg bg-primary text-primary-foreground',
                'font-mono text-[11px] uppercase tracking-[0.1em] font-bold',
                'hover:bg-primary/90 active:scale-[0.96]',
                'transition-[background-color,transform] duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
              )}
            >
              Open
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

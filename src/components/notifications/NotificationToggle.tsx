'use client';

import { Bell, BellOff, BellRing, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { cn } from '@/lib/utils';

interface NotificationToggleProps {
  className?: string;
  /** Hide once notifications are on (for surfaces that only need the nudge) */
  hideWhenOn?: boolean;
}

/**
 * Per-device opt-in for message notifications — the quiet chat-surface pill.
 * The settings page has its own fuller control (NotificationPreferenceTile).
 *
 * Renders nothing when push can't work here (unsupported browser, server
 * without VAPID keys) — an offer the app can't honour is worse than silence.
 * The two cases the user *can* act on get a line of copy instead: blocked
 * permission (browser settings) and iOS-in-a-tab (install the app first).
 */
export function NotificationToggle({ className, hideWhenOn }: NotificationToggleProps) {
  const {
    available,
    isSubscribed,
    isBlocked,
    needsInstall,
    isBusy,
    isLoading,
    enable,
    disable,
  } = usePushNotifications();

  if (isLoading) return null;

  if (needsInstall) {
    return (
      <p
        className={cn(
          'font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground flex items-center gap-1.5',
          className
        )}
      >
        <Bell className="w-3 h-3 shrink-0" aria-hidden="true" />
        Add to home screen for alerts
      </p>
    );
  }

  if (!available) return null;

  if (isBlocked && !isSubscribed) {
    return (
      <p
        className={cn(
          'font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground flex items-center gap-1.5',
          className
        )}
      >
        <BellOff className="w-3 h-3 shrink-0" aria-hidden="true" />
        Alerts blocked in browser
      </p>
    );
  }

  if (isSubscribed && hideWhenOn) return null;

  const handleClick = async () => {
    try {
      if (isSubscribed) {
        await disable();
        toast.success('Message notifications off');
      } else {
        await enable();
        toast.success('Message notifications on');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Couldn’t update notifications.');
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isBusy}
      aria-pressed={isSubscribed}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] font-bold',
        'transition-colors duration-150 touch-manipulation disabled:opacity-50 tap-target',
        isSubscribed
          ? 'text-muted-foreground hover:text-foreground'
          : 'bg-muted/60 text-foreground hover:bg-foreground hover:text-background',
        className
      )}
    >
      {isBusy ? (
        <Loader2 className="w-3 h-3 animate-spin shrink-0" aria-hidden="true" />
      ) : (
        /* Both bells stay mounted and cross-fade, so toggling doesn't pop */
        <span className="relative shrink-0" aria-hidden="true">
          <span
            className={cn(
              'absolute inset-0 flex items-center justify-center',
              'transition-[opacity,filter,transform] duration-300 ease-[cubic-bezier(0.2,0,0,1)]',
              isSubscribed ? 'scale-100 opacity-100 blur-0' : 'scale-[0.25] opacity-0 blur-[4px]'
            )}
          >
            <BellRing className="w-3 h-3" />
          </span>
          <span
            className={cn(
              'flex items-center justify-center',
              'transition-[opacity,filter,transform] duration-300 ease-[cubic-bezier(0.2,0,0,1)]',
              isSubscribed ? 'scale-[0.25] opacity-0 blur-[4px]' : 'scale-100 opacity-100 blur-0'
            )}
          >
            <Bell className="w-3 h-3" />
          </span>
        </span>
      )}
      {isSubscribed ? 'Alerts on' : 'Turn on alerts'}
    </button>
  );
}

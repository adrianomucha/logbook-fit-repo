'use client';

import { Bell, BellOff, BellRing, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { cn } from '@/lib/utils';
import { ALERTS_COPY } from '@logbook/shared/alerts-copy';

interface NotificationToggleProps {
  className?: string;
  /** Hide once notifications are on (for surfaces that only need the nudge) */
  hideWhenOn?: boolean;
  /**
   * Just the bell, no wording: the client's chat header, where the pill
   * crowded the coach's name. A slashed bell on a filled chip while alerts
   * are off, a plain bell once on. States the user has to fix elsewhere
   * (blocked, not installed) keep the slashed bell and explain on click.
   */
  iconOnly?: boolean;
}

const iconButtonClass =
  'inline-flex items-center justify-center w-10 h-10 rounded-full transition-colors duration-150 touch-manipulation';

/**
 * Per-device opt-in for message notifications — the quiet chat-surface pill.
 * The settings page has its own fuller control (NotificationPreferenceTile).
 *
 * Renders nothing when push can't work here (unsupported browser, server
 * without VAPID keys) — an offer the app can't honour is worse than silence.
 * The two cases the user *can* act on get a line of copy instead: blocked
 * permission (browser settings) and iOS-in-a-tab (install the app first).
 */
export function NotificationToggle({ className, hideWhenOn, iconOnly }: NotificationToggleProps) {
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

  // Icon-only: a state the app can't change itself is a muted slashed bell
  // that says what to do when clicked
  const explainer = (label: string, message: string) => (
    <button
      type="button"
      onClick={() => toast(message)}
      aria-label={label}
      title={label}
      className={cn(iconButtonClass, 'text-muted-foreground hover:text-foreground', className)}
    >
      <BellOff className="w-4 h-4" aria-hidden="true" />
    </button>
  );

  if (needsInstall) {
    if (iconOnly) return explainer(ALERTS_COPY.turnOn, ALERTS_COPY.needsInstall);
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
    if (iconOnly) return explainer(ALERTS_COPY.blockedLabel, ALERTS_COPY.blockedInBrowser);
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
        toast.success(ALERTS_COPY.nowOff);
      } else {
        await enable();
        toast.success(ALERTS_COPY.nowOn);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : ALERTS_COPY.failed);
    }
  };

  if (iconOnly) {
    const label = isSubscribed ? ALERTS_COPY.turnOff : ALERTS_COPY.turnOn;
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={isBusy}
        aria-pressed={isSubscribed}
        aria-label={label}
        title={label}
        className={cn(
          iconButtonClass,
          'disabled:opacity-50',
          isSubscribed
            ? 'text-muted-foreground hover:text-foreground'
            : 'bg-muted/60 text-foreground hover:bg-foreground hover:text-background',
          className
        )}
      >
        {isBusy ? (
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
        ) : isSubscribed ? (
          <Bell className="w-4 h-4" aria-hidden="true" />
        ) : (
          <BellOff className="w-4 h-4" aria-hidden="true" />
        )}
      </button>
    );
  }

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
              'transition-[opacity,filter,transform] duration-300 ease-out-strong',
              isSubscribed ? 'scale-100 opacity-100 blur-0' : 'scale-[0.25] opacity-0 blur-[4px]'
            )}
          >
            <BellRing className="w-3 h-3" />
          </span>
          <span
            className={cn(
              'flex items-center justify-center',
              'transition-[opacity,filter,transform] duration-300 ease-out-strong',
              isSubscribed ? 'scale-[0.25] opacity-0 blur-[4px]' : 'scale-100 opacity-100 blur-0'
            )}
          >
            <Bell className="w-3 h-3" />
          </span>
        </span>
      )}
      {isSubscribed ? 'Alerts on' : ALERTS_COPY.turnOn}
    </button>
  );
}

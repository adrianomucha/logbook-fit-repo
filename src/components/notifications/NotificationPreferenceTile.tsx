'use client';

import { Bell, BellRing, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { cn } from '@/lib/utils';

interface NotificationPreferenceTileProps {
  /** Who the alerts are about — copy only, the mechanics are identical */
  role: 'coach' | 'client';
}

const SWITCH_ID = 'message-alerts-switch';

/**
 * The settings-page control for per-device message alerts.
 *
 * One contained tile instead of a floating pill: icon well (volt once alerts
 * are on), title + description, a real switch, and a mono status line that
 * either names the device state or says why the switch is disabled — an
 * unavailable control should explain itself rather than vanish.
 */
export function NotificationPreferenceTile({ role }: NotificationPreferenceTileProps) {
  const {
    available,
    browserSupported,
    isSubscribed,
    isBlocked,
    needsInstall,
    isBusy,
    isLoading,
    enable,
    disable,
  } = usePushNotifications();

  const blockedReason: string | null = isLoading
    ? null
    : needsInstall
      ? 'Add the app to your home screen first'
      : !available
        ? browserSupported
          ? 'Alerts aren’t set up yet'
          : 'Not supported in this browser'
        : isBlocked && !isSubscribed
          ? 'Blocked in your browser settings'
          : null;

  const canToggle = !isLoading && !isBusy && blockedReason === null;

  const handleChange = async (next: boolean) => {
    if (!canToggle) return;
    try {
      if (next) {
        await enable();
        toast.success('Message notifications on');
      } else {
        await disable();
        toast.success('Message notifications off');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Couldn’t update notifications.');
    }
  };

  const status: string = isLoading
    ? 'Checking this device…'
    : blockedReason ?? (isSubscribed ? 'On for this device' : 'Off on this device');

  return (
    <div
      className={cn(
        'flex items-start gap-3.5 rounded-xl border border-border/60 p-4 transition-colors duration-300',
        isSubscribed ? 'bg-brand/[0.06] border-brand/40' : 'bg-secondary/40'
      )}
    >
      {/* Icon well — lights up volt once alerts are on so the state reads
          from across the room, not only from the switch */}
      <div
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors duration-300',
          isSubscribed
            ? 'bg-brand text-brand-foreground'
            : 'bg-background text-muted-foreground shadow-[0_0_0_1px_rgba(0,0,0,0.06)]'
        )}
        aria-hidden="true"
      >
        {isBusy ? (
          <Loader2 className="h-[18px] w-[18px] animate-spin" />
        ) : isSubscribed ? (
          <BellRing className="h-[18px] w-[18px]" strokeWidth={2.25} />
        ) : (
          <Bell className="h-[18px] w-[18px]" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-4">
          <label
            htmlFor={SWITCH_ID}
            className={cn(
              'text-sm font-semibold leading-tight pt-0.5',
              canToggle ? 'cursor-pointer' : 'cursor-default'
            )}
          >
            Message alerts
          </label>
          <Switch
            id={SWITCH_ID}
            checked={isSubscribed}
            onCheckedChange={handleChange}
            disabled={!canToggle}
            className="mt-px"
          />
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed mt-1">
          {role === 'coach'
            ? 'A push notification on this device when a client messages you.'
            : 'A push notification on this device when your coach messages you.'}{' '}
          Alerts are per device, so turn them on wherever you{' '}
          {role === 'coach' ? 'coach' : 'train'} from.
        </p>

        {/* Status line — the product's mono data voice; a volt dot marks "on" */}
        <p
          className="mt-3 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] font-medium text-muted-foreground antialiased"
          aria-live="polite"
        >
          <span
            className={cn(
              'h-1.5 w-1.5 shrink-0 rounded-full transition-colors duration-300',
              isSubscribed ? 'bg-brand' : 'bg-muted-foreground/40'
            )}
            aria-hidden="true"
          />
          {status}
        </p>
      </div>
    </div>
  );
}

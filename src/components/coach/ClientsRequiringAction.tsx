import { useRouter } from 'next/navigation';
import type { DashboardClient } from '@/types/api';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  urgencyStyle,
  getSignal,
  avatarColor,
  SignalLine,
  ChevronIcon,
} from '@/components/coach/shared/clientSignals';

interface ClientsRequiringActionProps {
  clients: DashboardClient[];
}

function ctaForUrgency(urgency: DashboardClient['urgency']): { label: string; variant: 'default' | 'outline' | 'ghost' } {
  switch (urgency) {
    case 'AWAITING_RESPONSE':
      return { label: 'Review Check-in', variant: 'default' };
    case 'AT_RISK':
      // The most urgent client gets the strongest, single obvious action.
      return { label: 'Send Reminder', variant: 'default' };
    case 'CHECKIN_DUE':
      return { label: 'View', variant: 'outline' };
    default:
      return { label: 'View', variant: 'ghost' };
  }
}

export function ClientsRequiringAction({ clients }: ClientsRequiringActionProps) {
  const router = useRouter();

  const needsAction = clients.filter((c) => c.urgency !== 'ON_TRACK');
  const onTrack = clients.filter((c) => c.urgency === 'ON_TRACK');

  if (needsAction.length === 0 && onTrack.length === 0) return null;

  const handleClientAction = (client: DashboardClient) => {
    if (client.urgency === 'AWAITING_RESPONSE' && client.pendingCheckIn) {
      router.push(`/coach/clients/${client.clientProfileId}/check-in`);
      return;
    }
    router.push(`/coach/clients/${client.clientProfileId}`);
  };

  const cardShadow =
    'shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.03),0_0_0_1px_rgba(0,0,0,0.04)]';

  return (
    <div className="space-y-6">
      {needsAction.length > 0 && (
        <section>
          <div className="flex items-baseline justify-between gap-3 px-1 pb-2.5">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground font-medium antialiased">
              Needs Attention · {needsAction.length}
            </h2>
            <p className="text-[11px] text-muted-foreground/70 antialiased hidden sm:block">
              Sorted by who&rsquo;s slipping fastest
            </p>
          </div>
          <div className={cn('bg-card rounded-xl divide-y divide-border overflow-hidden', cardShadow)}>
            {needsAction.map((client) => {
              const style = urgencyStyle(client.urgency);
              const cta = ctaForUrgency(client.urgency);
              const displayName = client.user.name || client.user.email;
              return (
                <div
                  key={client.clientProfileId}
                  className="relative flex items-center gap-2.5 sm:gap-3 py-2.5 pl-4 pr-3 sm:py-3 sm:pl-5 sm:pr-4 hover:bg-muted/50 active:bg-muted/70 active:scale-[0.995] transition-[background-color,transform] duration-150 cursor-pointer"
                  onClick={() => handleClientAction(client)}
                  role="link"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleClientAction(client);
                    }
                  }}
                >
                  {/* Urgency rail — state encoded in form, readable at a glance */}
                  <span className={cn('absolute left-0 inset-y-0 w-[3px]', style.rail)} aria-hidden="true" />

                  <div className={cn(
                    'w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center select-none text-xs sm:text-sm font-bold flex-shrink-0',
                    avatarColor(displayName)
                  )}>
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm sm:text-[15px] font-semibold truncate leading-tight">
                        {displayName}
                      </span>
                      <span className={cn(
                        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-medium leading-none whitespace-nowrap flex-shrink-0',
                        style.chip
                      )}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', style.dot)} />
                        {style.label}
                      </span>
                    </div>
                    <SignalLine signal={getSignal(client)} />
                  </div>
                  <Button
                    variant={cta.variant}
                    size="sm"
                    className="shrink-0 hidden sm:inline-flex"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClientAction(client);
                    }}
                  >
                    {cta.label}
                  </Button>
                  <div className="flex-shrink-0 pl-1 sm:hidden">
                    <ChevronIcon />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {onTrack.length > 0 && (
        <section>
          <div className="px-1 pb-2.5">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground font-medium antialiased">
              On Track · {onTrack.length}
            </h2>
          </div>
          <div className={cn('bg-card rounded-xl divide-y divide-border overflow-hidden', cardShadow)}>
            {onTrack.map((client) => {
              const style = urgencyStyle(client.urgency);
              const displayName = client.user.name || client.user.email;
              return (
                <div
                  key={client.clientProfileId}
                  className="flex items-center gap-2.5 sm:gap-3 py-2.5 px-3 sm:py-3 sm:px-4 hover:bg-muted/50 active:bg-muted/70 active:scale-[0.995] transition-[background-color,transform] duration-150 cursor-pointer"
                  onClick={() => router.push(`/coach/clients/${client.clientProfileId}`)}
                  role="link"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      router.push(`/coach/clients/${client.clientProfileId}`);
                    }
                  }}
                >
                  <div className={cn(
                    'w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center select-none text-xs sm:text-sm font-bold flex-shrink-0 opacity-90',
                    avatarColor(displayName)
                  )}>
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm sm:text-[15px] font-semibold truncate">
                        {displayName}
                      </p>
                      <span className={cn(
                        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-medium leading-none whitespace-nowrap flex-shrink-0',
                        style.chip
                      )}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', style.dot)} />
                        {style.label}
                      </span>
                    </div>
                    <SignalLine signal={getSignal(client)} />
                  </div>
                  <div className="flex-shrink-0 pl-1">
                    <ChevronIcon />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

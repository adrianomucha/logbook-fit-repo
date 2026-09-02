import { UserAvatar } from '@/components/UserAvatar';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { DashboardClient } from '@/types/api';
import { Button } from '@/components/ui/button';
import { useUnreadMessages } from '@/hooks/api/useUnreadMessages';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  urgencyStyle,
  getSignal,
  SignalLine,
  ChevronIcon,
  UnreadChip,
} from '@/components/coach/shared/clientSignals';

interface ClientsRequiringActionProps {
  clients: DashboardClient[];
}

function SampleChip() {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-dashed border-border font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.1em] text-muted-foreground leading-none whitespace-nowrap flex-shrink-0">
      Sample
    </span>
  );
}

function ctaForClient(client: DashboardClient): { label: string; variant: 'default' | 'outline' | 'ghost' } {
  // A submitted response always deserves a review, even when the client is
  // also at risk — their answer is the coach's opening to re-engage them
  if (client.pendingCheckIn?.status === 'CLIENT_RESPONDED') {
    return { label: 'Review Check-in', variant: 'default' };
  }
  // A brand-new client who hasn't heard from the coach yet: the relationship
  // opens with a hello, not a plan assignment
  if (client.awaitingHello) {
    return { label: 'Say hello', variant: 'default' };
  }
  switch (client.urgency) {
    case 'NEEDS_PLAN':
      return { label: 'Assign Plan', variant: 'default' };
    case 'PLAN_ENDED':
      return { label: 'Assign Next Plan', variant: 'default' };
    case 'AT_RISK':
      return { label: 'Send Reminder', variant: 'outline' };
    case 'CHECKIN_DUE':
      return { label: 'View', variant: 'outline' };
    default:
      return { label: 'View', variant: 'ghost' };
  }
}

// On-track clients are reassurance, not work — preview a handful and tuck
// the rest behind a toggle so the needs-attention list stays the page
const ON_TRACK_PREVIEW = 8;

export function ClientsRequiringAction({ clients }: ClientsRequiringActionProps) {
  const router = useRouter();
  const [showAllOnTrack, setShowAllOnTrack] = useState(false);
  const { threads } = useUnreadMessages();
  const unreadByUserId = useMemo(
    () => new Map(threads.map((thread) => [thread.userId, thread.count])),
    [threads]
  );

  const needsAction = clients.filter((c) => c.urgency !== 'ON_TRACK');
  const onTrack = clients.filter((c) => c.urgency === 'ON_TRACK');
  const visibleOnTrack = showAllOnTrack ? onTrack : onTrack.slice(0, ON_TRACK_PREVIEW);

  if (needsAction.length === 0 && onTrack.length === 0) return null;

  const handleClientAction = (client: DashboardClient) => {
    if (client.pendingCheckIn?.status === 'CLIENT_RESPONDED') {
      router.push(`/coach/clients/${client.clientProfileId}/check-in`);
      return;
    }
    if (client.awaitingHello) {
      router.push(`/coach/clients/${client.clientProfileId}?chat=1`);
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
          <div className="px-1 pb-2.5">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground font-medium antialiased">
              Needs Attention · {needsAction.length}
            </h2>
          </div>
          <div className={cn('bg-card rounded-xl divide-y divide-border overflow-hidden', cardShadow)}>
            {needsAction.map((client) => {
              const style = urgencyStyle(client.urgency);
              const cta = ctaForClient(client);
              const displayName = client.user.name || client.user.email;
              return (
                <div
                  key={client.clientProfileId}
                  className="flex items-center gap-2.5 sm:gap-3 py-2.5 px-3 sm:py-3 sm:px-4 hover:bg-muted/50 active:bg-muted/70 active:scale-[0.995] transition-[background-color,transform] duration-150 cursor-pointer"
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
                  <UserAvatar
                    name={displayName}
                    avatarUrl={client.user.avatarUrl}
                    className="w-9 h-9 sm:w-10 sm:h-10 text-xs sm:text-sm"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm sm:text-[15px] font-semibold truncate leading-tight">
                        {displayName}
                      </span>
                      {client.isSample && <SampleChip />}
                      <UnreadChip count={unreadByUserId.get(client.user.id) ?? 0} />
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
            {visibleOnTrack.map((client) => {
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
                  <UserAvatar
                    name={displayName}
                    avatarUrl={client.user.avatarUrl}
                    className="w-9 h-9 sm:w-10 sm:h-10 text-xs sm:text-sm opacity-90"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm sm:text-[15px] font-semibold truncate">
                        {displayName}
                      </p>
                      {client.isSample && <SampleChip />}
                      <UnreadChip count={unreadByUserId.get(client.user.id) ?? 0} />
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
          {onTrack.length > ON_TRACK_PREVIEW && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-1.5 text-muted-foreground"
              onClick={() => setShowAllOnTrack(!showAllOnTrack)}
            >
              {showAllOnTrack ? (
                <>
                  <ChevronUp className="w-4 h-4 mr-1" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 mr-1" />
                  Show all ({onTrack.length - ON_TRACK_PREVIEW} more)
                </>
              )}
            </Button>
          )}
        </section>
      )}
    </div>
  );
}

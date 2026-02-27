import { useRouter } from 'next/navigation';
import type { DashboardClient } from '@/types/api';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ClientsRequiringActionProps {
  clients: DashboardClient[];
}

function urgencyBadge(urgency: DashboardClient['urgency']) {
  switch (urgency) {
    case 'AT_RISK':
      return { label: 'At Risk', bg: 'bg-destructive/10', text: 'text-destructive', dot: 'bg-destructive' };
    case 'AWAITING_RESPONSE':
      return { label: 'Check-in Ready', bg: 'bg-info/10', text: 'text-info', dot: 'bg-info' };
    case 'CHECKIN_DUE':
      return { label: 'Check-in Due', bg: 'bg-warning/10', text: 'text-warning', dot: 'bg-warning' };
    case 'ON_TRACK':
      return { label: 'On Track', bg: 'bg-success/10', text: 'text-success', dot: 'bg-success' };
  }
}

function ctaForUrgency(urgency: DashboardClient['urgency']): { label: string; variant: 'default' | 'outline' | 'ghost' } {
  switch (urgency) {
    case 'AWAITING_RESPONSE':
      return { label: 'Review Check-in', variant: 'default' };
    case 'AT_RISK':
      return { label: 'Send Reminder', variant: 'outline' };
    case 'CHECKIN_DUE':
      return { label: 'View', variant: 'outline' };
    default:
      return { label: 'View', variant: 'ghost' };
  }
}

function getSubtitle(client: DashboardClient): string {
  const parts: string[] = [];
  if (client.activePlan) parts.push(client.activePlan.name);
  if (client.urgency === 'AT_RISK') {
    if (client.lastWorkoutAt) {
      const days = Math.floor(
        (Date.now() - new Date(client.lastWorkoutAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      parts.push(`Last workout ${days}d ago`);
    } else {
      parts.push('No workouts yet');
    }
  }
  return parts.join(' · ');
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

  return (
    <div className="space-y-6">
      {needsAction.length > 0 && (
        <section>
          <div className="px-1 pb-2">
            <span className="text-[11px] sm:text-xs uppercase tracking-wider text-muted-foreground font-medium">
              Needs Attention · {needsAction.length}
            </span>
          </div>
          <div className="bg-card rounded-xl border divide-y divide-border overflow-hidden">
            {needsAction.map((client) => {
              const badge = urgencyBadge(client.urgency);
              const cta = ctaForUrgency(client.urgency);
              const displayName = client.user.name || client.user.email;
              return (
                <div
                  key={client.clientProfileId}
                  className="flex items-center gap-3 sm:gap-4 py-3 px-3 sm:py-4 sm:px-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-muted to-muted/60 flex items-center justify-center select-none text-lg sm:text-xl flex-shrink-0">
                    {displayName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/coach/clients/${client.clientProfileId}`);
                        }}
                        className="text-sm sm:text-[15px] font-semibold truncate text-left hover:underline hover:text-primary transition-colors cursor-pointer"
                      >
                        {displayName}
                      </button>
                      <span className={cn(
                        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-medium leading-none whitespace-nowrap flex-shrink-0',
                        badge.bg, badge.text
                      )}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', badge.dot)} />
                        {badge.label}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate mt-0.5">
                      {getSubtitle(client)}
                    </p>
                  </div>
                  <Button
                    variant={cta.variant}
                    size="sm"
                    className="shrink-0 hidden sm:inline-flex"
                    onClick={() => handleClientAction(client)}
                  >
                    {cta.label}
                  </Button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {onTrack.length > 0 && (
        <section>
          <div className="px-1 pb-2">
            <span className="text-[11px] sm:text-xs uppercase tracking-wider text-muted-foreground font-medium">
              On Track · {onTrack.length}
            </span>
          </div>
          <div className="bg-card rounded-xl border divide-y divide-border overflow-hidden">
            {onTrack.map((client) => {
              const displayName = client.user.name || client.user.email;
              return (
                <div
                  key={client.clientProfileId}
                  className="flex items-center gap-3 sm:gap-4 py-3 px-3 sm:py-4 sm:px-4 hover:bg-muted/50 transition-colors cursor-pointer"
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
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-muted to-muted/60 flex items-center justify-center select-none text-lg sm:text-xl flex-shrink-0">
                    {displayName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm sm:text-[15px] font-semibold truncate">
                        {displayName}
                      </p>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-medium leading-none whitespace-nowrap flex-shrink-0 bg-success/10 text-success">
                        <span className="w-1.5 h-1.5 rounded-full bg-success" />
                        On Track
                      </span>
                    </div>
                    {client.activePlan && (
                      <p className="text-xs sm:text-sm text-muted-foreground truncate mt-0.5">
                        {client.activePlan.name}
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0 pl-1">
                    <svg className="w-4 h-4 text-muted-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
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

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
      return { label: 'At Risk', bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-500' };
    case 'AWAITING_RESPONSE':
      return { label: 'Check-in Ready', bg: 'bg-blue-50', text: 'text-blue-600', dot: 'bg-blue-500' };
    case 'CHECKIN_DUE':
      return { label: 'Check-in Due', bg: 'bg-amber-50', text: 'text-amber-600', dot: 'bg-amber-500' };
    case 'ON_TRACK':
      return { label: 'On Track', bg: 'bg-emerald-50', text: 'text-emerald-600', dot: 'bg-emerald-500' };
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
      parts.push(`${days}d since last workout`);
    } else {
      parts.push('No workouts yet');
    }
  }
  return parts.join(' · ');
}

// Deterministic color from name initial — avoids bland gray avatars
const AVATAR_COLORS = [
  'bg-rose-100 text-rose-700',
  'bg-sky-100 text-sky-700',
  'bg-amber-100 text-amber-700',
  'bg-violet-100 text-violet-700',
  'bg-emerald-100 text-emerald-700',
  'bg-orange-100 text-orange-700',
  'bg-teal-100 text-teal-700',
  'bg-pink-100 text-pink-700',
] as const;

function avatarColor(name: string) {
  const code = name.charCodeAt(0) || 0;
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
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
            <span className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground font-medium antialiased">
              Needs Attention · {needsAction.length}
            </span>
          </div>
          <div className="bg-card rounded-xl divide-y divide-border overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.03),0_0_0_1px_rgba(0,0,0,0.04)]">
            {needsAction.map((client) => {
              const badge = urgencyBadge(client.urgency);
              const cta = ctaForUrgency(client.urgency);
              const displayName = client.user.name || client.user.email;
              return (
                <div
                  key={client.clientProfileId}
                  className="flex items-center gap-3 sm:gap-4 py-3.5 px-3 sm:py-4 sm:px-4 hover:bg-muted/50 active:bg-muted/70 active:scale-[0.995] transition-[background-color,transform] duration-150 cursor-pointer"
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
                  <div className={cn(
                    'w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center select-none text-sm sm:text-base font-bold flex-shrink-0',
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
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClientAction(client);
                    }}
                  >
                    {cta.label}
                  </Button>
                  <div className="flex-shrink-0 pl-1 sm:hidden">
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

      {onTrack.length > 0 && (
        <section>
          <div className="px-1 pb-2">
            <span className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground font-medium antialiased">
              On Track · {onTrack.length}
            </span>
          </div>
          <div className="bg-card rounded-xl divide-y divide-border overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.03),0_0_0_1px_rgba(0,0,0,0.04)]">
            {onTrack.map((client) => {
              const displayName = client.user.name || client.user.email;
              return (
                <div
                  key={client.clientProfileId}
                  className="flex items-center gap-3 sm:gap-4 py-3.5 px-3 sm:py-4 sm:px-4 hover:bg-muted/50 active:bg-muted/70 active:scale-[0.995] transition-[background-color,transform] duration-150 cursor-pointer"
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
                    'w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center select-none text-sm sm:text-base font-bold flex-shrink-0',
                    avatarColor(displayName)
                  )}>
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm sm:text-[15px] font-semibold truncate">
                        {displayName}
                      </p>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-medium leading-none whitespace-nowrap flex-shrink-0 bg-emerald-50 text-emerald-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
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

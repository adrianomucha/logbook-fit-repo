import { useRouter } from 'next/navigation';
import { useCoachDashboard } from '@/hooks/api/useCoachDashboard';
import type { DashboardClient } from '@/types/api';
import { CoachNav } from '@/components/coach/CoachNav';
import { EmptyStateNoClients, EmptyStateNoneNeedAttention, EmptyStateAllNeedAttention } from '@/components/coach/EmptyStates';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

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

function ClientRow({ client }: { client: DashboardClient }) {
  const router = useRouter();
  const badge = urgencyBadge(client.urgency);
  const displayName = client.user.name || client.user.email;

  return (
    <div
      onClick={() => router.push(`/coach/clients/${client.clientProfileId}`)}
      className="flex items-center gap-3 sm:gap-4 py-3 px-3 sm:py-4 sm:px-4 hover:bg-muted/50 active:bg-muted/70 transition-colors cursor-pointer"
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          router.push(`/coach/clients/${client.clientProfileId}`);
        }
      }}
    >
      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-muted to-muted/60 flex items-center justify-center select-none text-xl sm:text-2xl flex-shrink-0">
        {displayName.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <h3 className="text-sm sm:text-[15px] font-semibold truncate leading-tight">
            {displayName}
          </h3>
          <span
            className={cn(
              'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-medium leading-none whitespace-nowrap flex-shrink-0',
              badge.bg, badge.text
            )}
          >
            <span className={cn('w-1.5 h-1.5 rounded-full', badge.dot)} />
            {badge.label}
          </span>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground truncate mt-0.5 leading-snug">
          {getSubtitle(client)}
        </p>
      </div>
      <div className="flex-shrink-0 pl-1">
        <svg className="w-4 h-4 text-muted-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  );
}

export function AllClientsPage() {
  const { clients, isLoading } = useCoachDashboard();

  const needsAttention = clients.filter((c) => c.urgency !== 'ON_TRACK');
  const onTrack = clients.filter((c) => c.urgency === 'ON_TRACK');

  return (
    <div className="min-h-screen bg-background p-3 sm:p-4 pb-24 sm:pb-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <CoachNav activeTab="clients" />

        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Clients</h1>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : clients.length === 0 ? (
          <EmptyStateNoClients />
        ) : (
          <>
            {needsAttention.length > 0 && (
              <section>
                <div className="px-1 pb-2">
                  <span className="text-[11px] sm:text-xs uppercase tracking-wider text-muted-foreground font-medium">
                    Needs attention · {needsAttention.length}
                  </span>
                </div>
                <div className="bg-card rounded-xl border divide-y divide-border overflow-hidden">
                  {needsAttention.map((client) => (
                    <ClientRow key={client.clientProfileId} client={client} />
                  ))}
                </div>
              </section>
            )}

            {needsAttention.length === 0 && <EmptyStateNoneNeedAttention />}

            {onTrack.length > 0 && (
              <section>
                <div className="px-1 pb-2">
                  <span className="text-[11px] sm:text-xs uppercase tracking-wider text-muted-foreground font-medium">
                    On track · {onTrack.length}
                  </span>
                </div>
                <div className="bg-card rounded-xl border divide-y divide-border overflow-hidden">
                  {onTrack.map((client) => (
                    <ClientRow key={client.clientProfileId} client={client} />
                  ))}
                </div>
              </section>
            )}

            {onTrack.length === 0 && needsAttention.length > 0 && <EmptyStateAllNeedAttention />}
          </>
        )}
      </div>
    </div>
  );
}

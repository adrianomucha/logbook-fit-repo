import { useRouter } from 'next/navigation';
import { useCoachDashboard } from '@/hooks/api/useCoachDashboard';
import type { DashboardClient } from '@/types/api';
import { CoachNav } from '@/components/coach/CoachNav';
import { EmptyStateNoClients } from '@/components/coach/EmptyStates';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Loader2, Plus } from 'lucide-react';

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

function ClientRow({ client }: { client: DashboardClient }) {
  const router = useRouter();
  const badge = urgencyBadge(client.urgency);
  const displayName = client.user.name || client.user.email;

  return (
    <div
      onClick={() => router.push(`/coach/clients/${client.clientProfileId}`)}
      className="flex items-center gap-3 sm:gap-4 py-3.5 px-3 sm:py-4 sm:px-4 hover:bg-muted/50 active:bg-muted/70 transition-colors cursor-pointer"
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
          {getSubtitle(client) || client.user.email}
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

  return (
    <div className="min-h-screen bg-background p-3 sm:p-4 pb-24 sm:pb-4">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        <CoachNav activeTab="clients" />

        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Clients</h1>
            {clients.length > 0 && (
              <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground mt-1">
                {clients.length} {clients.length === 1 ? 'client' : 'clients'}
              </p>
            )}
          </div>
          <Button size="sm" variant="outline">
            <Plus className="w-4 h-4 mr-1.5" />
            Invite Client
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : clients.length === 0 ? (
          <EmptyStateNoClients />
        ) : (
          <div className="bg-card rounded-xl border divide-y divide-border overflow-hidden">
            {clients.map((client) => (
              <ClientRow key={client.clientProfileId} client={client} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

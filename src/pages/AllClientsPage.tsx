import { AppState } from '@/types';
import { useMemo } from 'react';
import { getClientStatus } from '@/lib/client-status';
import { getClientSnippet } from '@/lib/snippet-helpers';
import { calculateNextCheckIn } from '@/lib/checkin-helpers';
import { ClientCard } from '@/components/coach/ClientCard';
import { EmptyStateNoClients, EmptyStateNoneNeedAttention, EmptyStateAllNeedAttention } from '@/components/coach/EmptyStates';
import { CoachNav } from '@/components/coach/CoachNav';

interface AllClientsPageProps {
  appState: AppState;
  onUpdateState: (updater: (state: AppState) => AppState) => void;
}

export function AllClientsPage({ appState, onUpdateState }: AllClientsPageProps) {
  // Calculate total unread messages from all clients
  const totalUnreadMessages = useMemo(() => {
    const coachClientIds = appState.clients.map((c) => c.id);
    return appState.messages.filter(
      (m) => coachClientIds.includes(m.senderId) && !m.read
    ).length;
  }, [appState.clients, appState.messages]);

  // Helper: look up plan name for a client
  const getPlanName = (clientPlanId?: string): string | undefined => {
    if (!clientPlanId) return undefined;
    const plan = appState.plans.find((p) => p.id === clientPlanId);
    return plan?.name;
  };

  // Compute client statuses
  const clientsWithStatus = useMemo(() => {
    return appState.clients.map(client => ({
      client,
      status: getClientStatus(
        client,
        appState.messages,
        appState.checkIns
      )
    }));
  }, [appState.clients, appState.messages, appState.checkIns, appState.completedWorkouts, appState.plans]);

  // Group by attention state
  const needsAttention = useMemo(() => {
    return clientsWithStatus
      .filter(c => c.status.type !== 'ok')
      .sort((a, b) => a.status.priority - b.status.priority);
  }, [clientsWithStatus]);

  const onTrack = useMemo(() => {
    return clientsWithStatus
      .filter(c => c.status.type === 'ok')
      .sort((a, b) => a.client.name.localeCompare(b.client.name));
  }, [clientsWithStatus]);

  // Empty state: no clients at all
  if (clientsWithStatus.length === 0) {
    return (
      <div className="min-h-screen bg-background p-3 sm:p-4 pb-24 sm:pb-4">
        <div className="max-w-7xl mx-auto space-y-4">
          <CoachNav activeTab="clients" unreadCount={totalUnreadMessages} />
          <EmptyStateNoClients />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-3 sm:p-4 pb-24 sm:pb-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <CoachNav activeTab="clients" unreadCount={totalUnreadMessages} />

        {/* NEEDS ATTENTION Section */}
        {needsAttention.length > 0 && (
          <section>
            <div className="px-1 sm:px-3 pb-2">
              <span className="text-[11px] sm:text-xs uppercase tracking-wider text-muted-foreground font-medium">
                Needs attention · {needsAttention.length}
              </span>
            </div>
            <div className="bg-card rounded-xl border divide-y divide-border overflow-hidden">
              {needsAttention.map(({ client, status }) => (
                <ClientCard
                  key={client.id}
                  client={client}
                  status={status}
                  variant="needs-attention"
                  snippet={getClientSnippet(client, status, appState)}
                  planName={getPlanName(client.currentPlanId)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Empty: None need attention */}
        {needsAttention.length === 0 && (
          <EmptyStateNoneNeedAttention />
        )}

        {/* ON TRACK Section */}
        {onTrack.length > 0 && (
          <section>
            <div className="px-1 sm:px-3 pb-2">
              <span className="text-[11px] sm:text-xs uppercase tracking-wider text-muted-foreground font-medium">
                On track · {onTrack.length}
              </span>
            </div>
            <div className="bg-card rounded-xl border divide-y divide-border overflow-hidden">
              {onTrack.map(({ client, status }) => (
                <ClientCard
                  key={client.id}
                  client={client}
                  status={status}
                  variant="on-track"
                  nextCheckInDate={calculateNextCheckIn(client)}
                  planName={getPlanName(client.currentPlanId)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Empty: All need attention */}
        {onTrack.length === 0 && needsAttention.length > 0 && (
          <EmptyStateAllNeedAttention />
        )}
      </div>
    </div>
  );
}

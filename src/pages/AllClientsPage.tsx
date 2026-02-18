import { AppState } from '@/types';
import { useMemo } from 'react';
import { getClientStatus } from '@/lib/client-status';
import { getClientSnippet } from '@/lib/snippet-helpers';
import { calculateNextCheckIn } from '@/lib/checkin-helpers';
import { ClientCard } from '@/components/coach/ClientCard';
import { EmptyStateNoClients, EmptyStateNoneNeedAttention, EmptyStateAllNeedAttention } from '@/components/coach/EmptyStates';
import { CoachNav } from '@/components/coach/CoachNav';
import { AlertTriangle, CheckCircle } from 'lucide-react';

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
  // Priority reference: 0=at-risk, 1=overdue, 2=pending-checkin, 3=unread, 4=ok
  const needsAttention = useMemo(() => {
    return clientsWithStatus
      .filter(c => c.status.type !== 'ok')  // All non-OK statuses
      .sort((a, b) => a.status.priority - b.status.priority);
  }, [clientsWithStatus]);

  const onTrack = useMemo(() => {
    return clientsWithStatus
      .filter(c => c.status.type === 'ok')  // OK status only
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
      <div className="max-w-7xl mx-auto space-y-4">
        <CoachNav activeTab="clients" unreadCount={totalUnreadMessages} />

        {/* NEEDS ATTENTION Section */}
        {needsAttention.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <h2 className="text-xl font-semibold">
                NEEDS ATTENTION
              </h2>
              <span className="text-sm text-muted-foreground">({needsAttention.length})</span>
            </div>
            <div className="space-y-3">
              {needsAttention.map(({ client, status }) => (
                <ClientCard
                  key={client.id}
                  client={client}
                  status={status}
                  variant="needs-attention"
                  snippet={getClientSnippet(client, status, appState)}
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
          <section className="opacity-90">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <h2 className="text-lg font-medium text-muted-foreground">
                ON TRACK
              </h2>
              <span className="text-sm text-muted-foreground">({onTrack.length})</span>
            </div>
            <div className="space-y-3">
              {onTrack.map(({ client, status }) => (
                <ClientCard
                  key={client.id}
                  client={client}
                  status={status}
                  variant="on-track"
                  nextCheckInDate={calculateNextCheckIn(client)}
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
